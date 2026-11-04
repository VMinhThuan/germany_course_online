import argon2 from "argon2";
import { Types } from "mongoose";
import { z } from "zod";
import { AuditLog, BootstrapMarker, User } from "../../db/models/index.js";
import { withTransaction } from "../../db/connection.js";

const ARGON_OPTIONS = {
  type: argon2.argon2id,
  timeCost: 2,
  memoryCost: 19_456,
  parallelism: 1,
} as const;

const bootstrapInputSchema = z.strictObject({
  fullName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
  operator: z.string().trim().min(1).max(120),
  approvalTicket: z
    .string()
    .trim()
    .min(3)
    .max(128)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/),
});

export type InitialAdminInput = z.input<typeof bootstrapInputSchema>;

export class AdminBootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminBootstrapError";
  }
}

export async function createInitialAdmin(
  input: InitialAdminInput,
): Promise<{ userId: string; email: string }> {
  const parsed = bootstrapInputSchema.safeParse(input);
  if (!parsed.success)
    throw new AdminBootstrapError(
      "Admin bootstrap input is invalid; expected a valid name/email, a 12-128 character password, operator, and approval ticket.",
    );

  const fullName = parsed.data.fullName;
  const email = parsed.data.email.toLowerCase();
  const existingAdmin = await User.exists({ role: "ADMIN" });
  const existingEmail = await User.exists({ email });
  if (existingAdmin || existingEmail)
    throw new AdminBootstrapError(
      "Initial Admin bootstrap was already used, an Admin exists, or the requested email is already registered.",
    );

  try {
    await ensureMarkerCollection();
    const existingMarker =
      await BootstrapMarker.findById("initial-admin").lean();
    if (existingMarker)
      throw new AdminBootstrapError(
        "Initial Admin bootstrap was already used, an Admin exists, or the requested email is already registered.",
      );

    const passwordHash = await argon2.hash(parsed.data.password, ARGON_OPTIONS);
    const userId = new Types.ObjectId();
    const now = new Date();
    return await withTransaction(async (session) => {
      const marker = await BootstrapMarker.findById("initial-admin")
        .session(session)
        .lean();
      const existingAdmin = await User.exists({ role: "ADMIN" }).session(
        session,
      );
      const existingEmail = await User.exists({ email }).session(session);
      if (marker || existingAdmin || existingEmail)
        throw new AdminBootstrapError(
          "Initial Admin bootstrap was already used, an Admin exists, or the requested email is already registered.",
        );

      await BootstrapMarker.create(
        [
          {
            _id: "initial-admin",
            userId,
            operator: parsed.data.operator,
            approvalTicket: parsed.data.approvalTicket,
            createdAt: now,
          },
        ],
        { session },
      );
      await User.create(
        [
          {
            _id: userId,
            fullName,
            email,
            passwordHash,
            role: "ADMIN",
            status: "ACTIVE",
            emailVerifiedAt: null,
          },
        ],
        { session },
      );
      await AuditLog.create(
        [
          {
            actorUserId: null,
            action: "ADMIN_BOOTSTRAPPED",
            entityType: "User",
            entityId: userId.toString(),
            oldValue: null,
            newValue: {
              email,
              role: "ADMIN",
              status: "ACTIVE",
              bootstrapOperator: parsed.data.operator,
              approvalTicket: parsed.data.approvalTicket,
            },
            ipAddress: null,
          },
        ],
        { session },
      );

      return { userId: userId.toString(), email };
    });
  } catch (error) {
    if (error instanceof AdminBootstrapError) throw error;
    if (isDuplicateKeyError(error))
      throw new AdminBootstrapError(
        "Initial Admin bootstrap already exists or collided with a duplicate account; no credentials were changed.",
      );
    throw error;
  }
}

async function ensureMarkerCollection(): Promise<void> {
  try {
    await BootstrapMarker.createCollection();
  } catch (error) {
    if (errorCode(error) !== 48) throw error;
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  return errorCode(error) === 11000;
}

function errorCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("code" in error))
    return undefined;
  return typeof error.code === "number" ? error.code : undefined;
}
