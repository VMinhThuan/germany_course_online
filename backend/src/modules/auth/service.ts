import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import type { Logger } from "pino";
import mongoose, { Types } from "mongoose";
import type { AppConfig } from "../../config/env.js";
import {
  AuditLog,
  MediaAsset,
  LoginEvent,
  PasswordResetToken,
  User,
  UserSession,
} from "../../db/models/index.js";
import { withTransaction } from "../../db/connection.js";
import { AppError, conflict, unauthorized } from "../../shared/errors.js";
import { issueAccessToken } from "./jwt.js";
import type { EmailService } from "./email-service.js";
import type { MediaStorageAdapter } from "../learning/media-storage.js";

const ARGON_OPTIONS = {
  type: argon2.argon2id,
  timeCost: 2,
  memoryCost: 19_456,
  parallelism: 1,
} as const;
const REFRESH_TOKEN_BYTES = 32;
const RESET_TOKEN_BYTES = 32;
const REFRESH_HISTORY_LIMIT = 5;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

const hashOpaqueToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

export type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: "STUDENT" | "ADMIN";
  status: "ACTIVE" | "BLOCKED";
};

type RequestMeta = {
  ipAddress: string | null;
  userAgent: string | null;
  deviceName: string | null;
};

export class AuthService {
  private readonly dummyHash = argon2.hash(
    "timing-only-not-a-user-password",
    ARGON_OPTIONS,
  );

  constructor(
    private readonly config: AppConfig,
    private readonly emailService: EmailService,
    private readonly logger: Logger,
    private readonly mediaStorage: MediaStorageAdapter,
  ) {}

  async register(input: {
    fullName: string;
    email: string;
    password: string;
  }): Promise<UserProfile> {
    const email = input.email.trim().toLowerCase();
    const passwordHash = await argon2.hash(input.password, ARGON_OPTIONS);
    try {
      const user = await User.create({
        fullName: input.fullName.trim(),
        email,
        passwordHash,
        role: "STUDENT",
        status: "ACTIVE",
      });
      return this.toProfile(user);
    } catch (error) {
      if (isDuplicateKeyError(error))
        throw conflict("An account with this email already exists.");
      throw error;
    }
  }

  async login(
    input: { email: string; password: string },
    meta: RequestMeta,
  ): Promise<{
    accessToken: string;
    expiresIn: number;
    profile: UserProfile;
    refreshToken: string;
    sessionId: string;
    expiresAt: Date;
  }> {
    const email = input.email.trim().toLowerCase();
    const user = await User.findOne({ email }).select("+passwordHash");
    const passwordHash = user?.get("passwordHash") as string | undefined;
    const matches = await argon2
      .verify(passwordHash ?? (await this.dummyHash), input.password)
      .catch(() => false);
    if (!user || !matches) {
      await this.recordLoginEvent(
        user?._id,
        "FAILURE",
        "INVALID_CREDENTIALS",
        meta,
      );
      throw unauthorized("UNAUTHORIZED", "Email or password is incorrect.");
    }
    if (user.get("status") !== "ACTIVE") {
      await this.recordLoginEvent(user._id, "FAILURE", "ACCOUNT_BLOCKED", meta);
      throw new AppError(403, "ACCOUNT_BLOCKED", "This account is blocked.");
    }
    if (passwordHash && argon2.needsRehash(passwordHash, ARGON_OPTIONS)) {
      const upgradedHash = await argon2.hash(input.password, ARGON_OPTIONS);
      await User.updateOne(
        { _id: user._id, passwordHash },
        { $set: { passwordHash: upgradedHash } },
      );
    }

    const role = user.get("role") as "STUDENT" | "ADMIN";
    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString("base64url");
    const refreshTokenHash = hashOpaqueToken(refreshToken);
    const expiresAt = new Date(
      Date.now() + this.config.sessionTtlDays * 24 * 60 * 60 * 1000,
    );
    let sessionId: string | undefined;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        sessionId = await withTransaction(async (session) => {
          if (role === "STUDENT") {
            await UserSession.updateMany(
              { userId: user._id, status: "ACTIVE", roleAtIssue: "STUDENT" },
              {
                $set: {
                  status: "REVOKED",
                  revokedAt: new Date(),
                  revokeReason: "REPLACED_BY_NEW_LOGIN",
                },
              },
              { session },
            );
          }
          const [newSession] = await UserSession.create(
            [
              {
                userId: user._id,
                refreshTokenHash,
                previousRefreshTokenHashes: [],
                deviceName: meta.deviceName,
                userAgent: meta.userAgent,
                ipAddress: meta.ipAddress,
                roleAtIssue: role,
                status: "ACTIVE",
                expiresAt,
                lastActiveAt: new Date(),
              },
            ],
            { session },
          );
          await LoginEvent.create(
            [
              {
                userId: user._id,
                outcome: "SUCCESS",
                reasonCode: "LOGIN_SUCCESS",
                ipAddress: meta.ipAddress,
                userAgent: meta.userAgent,
              },
            ],
            { session },
          );
          return newSession!.id;
        });
        break;
      } catch (error) {
        if (!isDuplicateKeyError(error) || attempt === 3) throw error;
      }
    }
    if (!sessionId)
      throw new Error("Login transaction did not create a session.");
    const accessToken = await issueAccessToken(this.config, {
      sub: user.id,
      sid: sessionId,
      role,
    });
    return {
      accessToken,
      expiresIn: this.config.accessTokenTtlSeconds,
      profile: await this.toProfile(user),
      refreshToken,
      sessionId,
      expiresAt,
    };
  }

  async refresh(refreshToken: string | undefined): Promise<{
    accessToken: string;
    expiresIn: number;
    profile: UserProfile;
    rotatedToken: string;
    expiresAt: Date;
  }> {
    if (!refreshToken)
      throw unauthorized(
        "UNAUTHORIZED",
        "Refresh session is invalid or expired.",
      );
    const tokenHash = hashOpaqueToken(refreshToken);
    const transactionResult = await withTransaction(
      async (transactionSession) => {
        const session = await UserSession.findOne({
          refreshTokenHash: tokenHash,
        })
          .select("+refreshTokenHash +previousRefreshTokenHashes")
          .session(transactionSession);
        if (!session) {
          const reusedSession = await UserSession.findOne({
            previousRefreshTokenHashes: tokenHash,
            status: "ACTIVE",
          })
            .select("+previousRefreshTokenHashes")
            .session(transactionSession);
          if (reusedSession) {
            reusedSession.set({
              status: "REVOKED",
              revokedAt: new Date(),
              revokeReason: "REFRESH_TOKEN_REUSE",
            });
            await reusedSession.save({ session: transactionSession });
            return { kind: "reused" as const };
          }
          return { kind: "invalid" as const };
        }
        if (session.get("status") !== "ACTIVE")
          return { kind: "invalid" as const };
        if ((session.get("expiresAt") as Date).getTime() <= Date.now()) {
          session.set({
            status: "EXPIRED",
            revokedAt: new Date(),
            revokeReason: "SESSION_EXPIRED",
          });
          await session.save({ session: transactionSession });
          return { kind: "invalid" as const };
        }

        const user = await User.findById(session.get("userId")).session(
          transactionSession,
        );
        if (!user || user.get("status") !== "ACTIVE") {
          session.set({
            status: "REVOKED",
            revokedAt: new Date(),
            revokeReason: "ACCOUNT_INACTIVE",
          });
          await session.save({ session: transactionSession });
          return { kind: "invalid" as const };
        }

        const rotatedToken =
          randomBytes(REFRESH_TOKEN_BYTES).toString("base64url");
        const previousHashes = session.get(
          "previousRefreshTokenHashes",
        ) as string[];
        session.set({
          refreshTokenHash: hashOpaqueToken(rotatedToken),
          previousRefreshTokenHashes: [...previousHashes, tokenHash].slice(
            -REFRESH_HISTORY_LIMIT,
          ),
          lastActiveAt: new Date(),
        });
        await session.save({ session: transactionSession });
        return {
          kind: "ok" as const,
          rotatedToken,
          sessionId: session.id,
          role: user.get("role") as "STUDENT" | "ADMIN",
          userId: user.id,
          expiresAt: session.get("expiresAt") as Date,
        };
      },
    );

    if (transactionResult.kind === "reused")
      throw unauthorized(
        "SESSION_REVOKED",
        "Refresh token reuse revoked this session.",
      );
    if (transactionResult.kind !== "ok")
      throw unauthorized(
        "UNAUTHORIZED",
        "Refresh session is invalid or expired.",
      );
    const accessToken = await issueAccessToken(this.config, {
      sub: transactionResult.userId,
      sid: transactionResult.sessionId,
      role: transactionResult.role,
    });
    return {
      accessToken,
      expiresIn: this.config.accessTokenTtlSeconds,
      profile: await this.me(transactionResult.userId),
      rotatedToken: transactionResult.rotatedToken,
      expiresAt: transactionResult.expiresAt,
    };
  }

  async logout(sessionId: string | undefined, userId: string): Promise<void> {
    if (
      !sessionId ||
      !Types.ObjectId.isValid(sessionId) ||
      !Types.ObjectId.isValid(userId)
    )
      return;
    await UserSession.updateOne(
      { _id: sessionId, userId, status: "ACTIVE" },
      {
        $set: {
          status: "REVOKED",
          revokedAt: new Date(),
          revokeReason: "LOGOUT",
        },
      },
    );
  }

  async me(userId: string): Promise<UserProfile> {
    const user = await User.findById(userId);
    if (!user || user.get("status") !== "ACTIVE")
      throw unauthorized("UNAUTHORIZED", "Authentication is required.");
    return this.toProfile(user);
  }

  async updateMyProfile(
    userId: string,
    patch: {
      fullName?: string | undefined;
      phone?: string | null | undefined;
      avatarAssetId?: string | null | undefined;
    },
    ipAddress: string | null,
  ): Promise<UserProfile> {
    const user = await User.findOne({
      _id: userId,
      status: "ACTIVE",
      role: "STUDENT",
    });
    if (!user)
      throw unauthorized("UNAUTHORIZED", "Authentication is required.");
    if (patch.avatarAssetId) {
      const asset = await MediaAsset.findOne({
        _id: patch.avatarAssetId,
        mediaType: "IMAGE",
        visibility: "PUBLIC",
        deletedAt: null,
        uploadStatus: "READY",
      })
        .select("_id")
        .lean();
      if (!asset)
        throw new AppError(
          422,
          "INVALID_AVATAR_ASSET",
          "Avatar must reference a ready image asset.",
        );
    }
    const fields = Object.keys(patch);
    await withTransaction(async (session) => {
      const current = await User.findOne({
        _id: userId,
        status: "ACTIVE",
        role: "STUDENT",
      }).session(session);
      if (!current)
        throw unauthorized("UNAUTHORIZED", "Authentication is required.");
      if (patch.avatarAssetId) {
        const locked = await MediaAsset.updateOne(
          {
            _id: patch.avatarAssetId,
            mediaType: "IMAGE",
            visibility: "PUBLIC",
            deletedAt: null,
            uploadStatus: "READY",
          },
          { $inc: { referenceRevision: 1 } },
          { session },
        );
        if (locked.modifiedCount !== 1)
          throw new AppError(
            422,
            "INVALID_AVATAR_ASSET",
            "Avatar must reference a ready image asset.",
          );
      }
      if (patch.fullName !== undefined) current.set("fullName", patch.fullName);
      if (patch.phone !== undefined) current.set("phone", patch.phone);
      if (patch.avatarAssetId !== undefined)
        current.set("avatarAssetId", patch.avatarAssetId);
      await current.save({ session, validateModifiedOnly: true });
      await AuditLog.create(
        [
          {
            actorUserId: new Types.ObjectId(userId),
            action: "STUDENT_PROFILE_UPDATED",
            entityType: "USER",
            entityId: new Types.ObjectId(userId),
            oldValue: null,
            newValue: { changedFields: fields },
            ipAddress,
          },
        ],
        { session },
      );
    });
    return this.me(userId);
  }

  async changeMyPassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress: string | null,
  ): Promise<void> {
    const user = await User.findOne({
      _id: userId,
      status: "ACTIVE",
      role: "STUDENT",
    }).select("+passwordHash");
    if (!user)
      throw unauthorized("UNAUTHORIZED", "Authentication is required.");
    const currentHash = user.get("passwordHash") as string;
    const matches = await argon2
      .verify(currentHash, currentPassword)
      .catch(() => false);
    if (!matches)
      throw new AppError(
        400,
        "CURRENT_PASSWORD_INVALID",
        "Current password is incorrect.",
      );
    const passwordHash = await argon2.hash(newPassword, ARGON_OPTIONS);
    await withTransaction(async (session) => {
      const changed = await User.updateOne(
        { _id: user._id, passwordHash: currentHash, status: "ACTIVE" },
        { $set: { passwordHash } },
        { session },
      );
      if (changed.modifiedCount !== 1)
        throw conflict("Password changed concurrently; authenticate again.");
      await UserSession.updateMany(
        { userId: user._id, status: "ACTIVE" },
        {
          $set: {
            status: "REVOKED",
            revokedAt: new Date(),
            revokeReason: "PASSWORD_CHANGED",
          },
        },
        { session },
      );
      await AuditLog.create(
        [
          {
            actorUserId: user._id,
            action: "STUDENT_PASSWORD_CHANGED",
            entityType: "USER",
            entityId: user._id,
            oldValue: null,
            newValue: { changedFields: ["passwordHash"] },
            ipAddress,
          },
        ],
        { session },
      );
    });
  }

  async listMySessions(userId: string, currentSessionId: string) {
    const [sessions, total] = await Promise.all([
      UserSession.find({ userId: new Types.ObjectId(userId) })
        .select("deviceName status expiresAt createdAt lastActiveAt")
        .sort({ lastActiveAt: -1, createdAt: -1, _id: -1 })
        .limit(51)
        .lean(),
      UserSession.countDocuments({ userId: new Types.ObjectId(userId) }),
    ]);
    const hasMore = sessions.length > 50;
    return {
      items: sessions.slice(0, 50).map((session) => ({
        id: session._id.toString(),
        deviceName: session.deviceName ?? null,
        status:
          session.status === "ACTIVE" &&
          session.expiresAt.getTime() <= Date.now()
            ? "EXPIRED"
            : session.status,
        lastActiveAt: (session.lastActiveAt ?? session.createdAt).toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        isCurrent: session._id.toString() === currentSessionId,
      })),
      page: 1,
      pageSize: 50,
      total,
      hasMore,
    };
  }

  async revokeMySession(
    userId: string,
    sessionId: string,
    ipAddress: string | null,
  ): Promise<void> {
    const userObjectId = new Types.ObjectId(userId);
    const sessionObjectId = new Types.ObjectId(sessionId);
    await withTransaction(async (session) => {
      const target = await UserSession.findOne({
        _id: sessionObjectId,
        userId: userObjectId,
      }).session(session);
      if (!target) throw new AppError(404, "NOT_FOUND", "Session not found.");
      if (target.get("status") === "ACTIVE") {
        target.set({
          status: "REVOKED",
          revokedAt: new Date(),
          revokeReason: "SELF_REVOKED",
        });
        await target.save({ session });
        await AuditLog.create(
          [
            {
              actorUserId: userObjectId,
              action: "STUDENT_SESSION_REVOKED",
              entityType: "USER_SESSION",
              entityId: sessionObjectId,
              oldValue: null,
              newValue: { changedFields: ["status"] },
              ipAddress,
            },
          ],
          { session },
        );
      }
    });
  }

  async forgotPassword(emailInput: string): Promise<void> {
    if (!this.emailService.available) return;
    const email = emailInput.trim().toLowerCase();
    const user = await User.findOne({ email, status: "ACTIVE" });
    if (!user) return;

    const token = randomBytes(RESET_TOKEN_BYTES).toString("base64url");
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await PasswordResetToken.deleteMany({ userId: user._id, consumedAt: null });
    await PasswordResetToken.create({
      userId: user._id,
      tokenHash: hashOpaqueToken(token),
      expiresAt,
      consumedAt: null,
    });
    const resetUrl = new URL(
      this.config.passwordResetUrl ?? "http://localhost:5173/reset-password",
    );
    resetUrl.searchParams.set("token", token);
    try {
      await this.emailService.sendPasswordReset({
        to: user.get("email") as string,
        resetUrl: resetUrl.toString(),
        expiresAt,
      });
    } catch (error) {
      this.logger.warn(
        {
          userId: user.id,
          errorType: error instanceof Error ? error.name : "UnknownError",
        },
        "password reset email delivery failed",
      );
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashOpaqueToken(token);
    const passwordHash = await argon2.hash(newPassword, ARGON_OPTIONS);
    const result = await withTransaction(async (session) => {
      const reset = await PasswordResetToken.findOne({
        tokenHash,
        consumedAt: null,
        expiresAt: { $gt: new Date() },
      })
        .select("+tokenHash")
        .session(session);
      if (!reset) return false;
      const consumed = await PasswordResetToken.updateOne(
        { _id: reset._id, consumedAt: null, expiresAt: { $gt: new Date() } },
        { $set: { consumedAt: new Date() } },
        { session },
      );
      if (consumed.modifiedCount !== 1) return false;
      await User.updateOne(
        { _id: reset.get("userId") },
        { $set: { passwordHash } },
        { session },
      );
      await UserSession.updateMany(
        { userId: reset.get("userId"), status: "ACTIVE" },
        {
          $set: {
            status: "REVOKED",
            revokedAt: new Date(),
            revokeReason: "PASSWORD_RESET",
          },
        },
        { session },
      );
      return true;
    });
    if (!result)
      throw new AppError(
        400,
        "RESET_TOKEN_INVALID",
        "Password reset token is invalid or expired.",
      );
  }

  getRefreshCookieOptions(expiresAt?: Date): {
    httpOnly: true;
    secure: boolean;
    sameSite: "lax" | "strict" | "none";
    path: string;
    maxAge: number;
  } {
    return {
      httpOnly: true,
      secure: this.config.cookieSecure,
      sameSite: this.config.cookieSameSite,
      path: "/api/v1/auth",
      maxAge: expiresAt
        ? Math.max(0, expiresAt.getTime() - Date.now())
        : this.config.sessionTtlDays * 24 * 60 * 60 * 1000,
    };
  }

  get refreshCookieName(): string {
    return "paniverse_refresh";
  }

  private async toProfile(user: mongoose.Document): Promise<UserProfile> {
    const avatarAssetId = user.get("avatarAssetId");
    let avatarUrl: string | null = null;
    if (avatarAssetId) {
      try {
        const asset = await MediaAsset.findOne({
          _id: avatarAssetId,
          mediaType: "IMAGE",
          visibility: "PUBLIC",
          deletedAt: null,
          uploadStatus: "READY",
        })
          .select("+provider +storageKey +resourceType +deliveryType +format")
          .lean();
        const adapter = asset
          ? resolveMediaStorage(this.mediaStorage, asset.provider)
          : undefined;
        if (asset && adapter) {
          avatarUrl = (
            await adapter.signRead({
              storageKey: asset.storageKey,
              mimeType: asset.mimeType,
              mediaType: asset.mediaType,
              resourceType: asset.resourceType ?? null,
              deliveryType: asset.deliveryType ?? null,
              format: asset.format ?? null,
            })
          ).url;
        }
      } catch {
        // Profile responses remain available if optional avatar delivery is offline.
      }
    }
    return {
      id: String(user.get("_id")),
      fullName: user.get("fullName") as string,
      email: user.get("email") as string,
      phone: (user.get("phone") as string | null | undefined) ?? null,
      avatarUrl,
      role: user.get("role") as "STUDENT" | "ADMIN",
      status: user.get("status") as "ACTIVE" | "BLOCKED",
    };
  }

  private async recordLoginEvent(
    userId: Types.ObjectId | undefined,
    outcome: "SUCCESS" | "FAILURE",
    reasonCode: string,
    meta: RequestMeta,
  ): Promise<void> {
    await LoginEvent.create({
      userId: userId ?? null,
      outcome,
      reasonCode,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function resolveMediaStorage(
  storage: MediaStorageAdapter,
  providerValue: unknown,
): MediaStorageAdapter | undefined {
  if (providerValue !== "S3_COMPATIBLE" && providerValue !== "CLOUDINARY")
    return undefined;
  const resolved = storage.resolve?.(providerValue);
  if (resolved) return resolved;
  if (
    !storage.resolve &&
    (!storage.provider || storage.provider === providerValue)
  )
    return storage;
  return undefined;
}
