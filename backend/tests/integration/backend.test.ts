import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import argon2 from "argon2";
import { createHash } from "node:crypto";
import { SignJWT } from "jose";
import { createApp } from "../../src/app.js";
import {
  createVercelApp,
  createVercelHandler,
} from "../../src/runtime/vercel-app.js";
import { createLogger } from "../../src/http/logger.js";
import {
  closeHttpServer,
  listenHttp,
} from "../../src/http/server-lifecycle.js";
import { verifyAccessToken } from "../../src/modules/auth/jwt.js";
import { FakeEmailService } from "../../src/modules/auth/email-service.js";
import {
  Course,
  CourseSection,
  Lesson,
  MediaAsset,
  PasswordResetToken,
  SiteSettings,
  User,
  UserSession,
} from "../../src/db/models/index.js";
import {
  clearTestDatabase,
  startTestDatabase,
  stopTestDatabase,
} from "../support/test-database.js";
import type { AppConfig } from "../../src/config/env.js";

const origin = "http://localhost:5173";
const student = {
  fullName: "Test Student",
  email: "student@example.test",
  password: "TestPassword123!",
};

let config: AppConfig;
let app: ReturnType<typeof createApp>;
let fakeEmail: FakeEmailService;

function cookieHeaders(response: request.Response): string[] {
  const header = response.headers["set-cookie"];
  return Array.isArray(header) ? header : header ? [header] : [];
}

function cookieFrom(response: request.Response): string {
  const cookies = cookieHeaders(response);
  const cookie = cookies
    ?.find((value) => value.startsWith("paniverse_refresh="))
    ?.split(";")[0];
  if (!cookie) throw new Error("Expected refresh cookie was not set.");
  return cookie;
}

async function registerUser(overrides: Partial<typeof student> = {}) {
  return request(app)
    .post("/api/v1/auth/register")
    .send({ ...student, ...overrides });
}

async function loginUser(email = student.email, password = student.password) {
  return request(app).post("/api/v1/auth/login").send({ email, password });
}

async function createPublishedCourse(
  options: {
    price?: string;
    slug?: string;
    thumbnailAssetId?: mongoose.Types.ObjectId;
  } = {},
) {
  const course = await Course.create({
    code: `A1-${new mongoose.Types.ObjectId().toString().slice(-6)}`,
    title: "German A1",
    slug: options.slug ?? "german-a1",
    description: "Public course description.",
    shortDescription: "Beginner German.",
    objectives: ["Speak German"],
    requirements: ["None"],
    level: "A1",
    thumbnailAssetId: options.thumbnailAssetId ?? null,
    bannerAssetId: null,
    introVideoAssetId: null,
    price: mongoose.Types.Decimal128.fromString(options.price ?? "1950000"),
    accessDurationMonths: 12,
    status: "PUBLISHED",
    sortOrder: 1,
    deletedAt: null,
  });
  return course;
}

async function createMedia(visibility: "PUBLIC" | "ENROLLED" = "PUBLIC") {
  const key = new mongoose.Types.ObjectId().toString();
  return MediaAsset.create({
    originalName: `internal-folder/private-file-name-${key}.jpg`,
    mediaType: "IMAGE",
    mimeType: "image/jpeg",
    fileSize: 1234,
    provider: "private-provider",
    storageKey: `secret/bucket/${key}`,
    externalMediaId: `private-external-id-${key}`,
    durationSeconds: null,
    uploadedById: null,
    visibility,
  });
}

describe("Express foundation, auth, and public APIs", () => {
  beforeAll(async () => {
    config = await startTestDatabase();
    fakeEmail = new FakeEmailService();
    app = createApp(config, { emailService: fakeEmail, readiness: () => true });
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    fakeEmail.deliveries.splice(0);
  });

  describe("foundation", () => {
    it("separates liveness and readiness and returns request IDs", async () => {
      const live = await request(app)
        .get("/health")
        .set("x-request-id", "request-123");
      expect(live.status).toBe(200);
      expect(live.body).toEqual({ success: true, data: { status: "ok" } });
      expect(live.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/i);
      expect(live.headers["x-request-id"]).not.toBe("request-123");

      const notReady = createApp(config, { readiness: () => false });
      const ready = await request(notReady).get("/ready");
      expect(ready.status).toBe(503);
      expect(ready.body.error.code).toBe("NOT_READY");
      expect(ready.body.requestId).toBe(ready.headers["x-request-id"]);

      const databaseReady = await request(createApp(config)).get("/ready");
      expect(databaseReady.status).toBe(200);
      expect(databaseReady.body).toEqual({
        success: true,
        data: { status: "ready" },
      });
      expect(JSON.stringify(databaseReady.body)).not.toMatch(
        /mongodb|credential|secret|stack/i,
      );
    });

    it("serves the shared Express health contract through the Vercel and persistent adapters", async () => {
      let lazyDatabaseCalls = 0;
      const vercelApp = createVercelApp(config, {
        emailService: fakeEmail,
        ensureDatabase: async () => {
          lazyDatabaseCalls += 1;
        },
      });
      const persistentApp = createApp(config, {
        emailService: fakeEmail,
        readiness: () => true,
      });
      const handler = createVercelHandler({
        NODE_ENV: "test",
        MONGODB_URI: config.mongoUri,
        MONGODB_DB_NAME: config.databaseName,
        JWT_ACCESS_SECRET: config.jwtAccessSecret,
        JWT_ISSUER: config.jwtIssuer,
        JWT_AUDIENCE: config.jwtAudience,
        APP_ORIGINS: origin,
      });

      const [vercelHealth, persistentHealth] = await Promise.all([
        request(handler).get("/health"),
        request(persistentApp).get("/health"),
      ]);
      expect(vercelHealth.status).toBe(200);
      expect(vercelHealth.body).toEqual(persistentHealth.body);
      expect(lazyDatabaseCalls).toBe(0);

      const adapterHealth = await request(vercelApp).get("/health");
      expect(adapterHealth.body).toEqual(persistentHealth.body);

      const vercelReady = await request(vercelApp).get("/ready");
      expect(vercelReady.status).toBe(200);
      expect(lazyDatabaseCalls).toBe(1);
    });

    it("keeps Vercel liveness available while failing closed without environment configuration", async () => {
      const unconfigured = createVercelHandler({ NODE_ENV: "production" });
      const health = await request(unconfigured).get("/health");
      const ready = await request(unconfigured).get("/ready");
      const api = await request(unconfigured).get("/api/v1/courses");

      expect(health.status).toBe(200);
      expect(health.body).toEqual({
        success: true,
        data: { status: "ok" },
      });
      expect(health.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/i);
      expect(ready.status).toBe(503);
      expect(ready.body.error.code).toBe("CONFIGURATION_UNAVAILABLE");
      expect(ready.body.requestId).toBe(ready.headers["x-request-id"]);
      expect(api.status).toBe(503);
      expect(api.body.error.code).toBe("CONFIGURATION_UNAVAILABLE");
      expect(JSON.stringify([ready.body, api.body])).not.toMatch(
        /mongodb|credential|secret|stack/i,
      );
    });

    it("protects the bounded Vercel outbox endpoint and never reports disabled email as success", async () => {
      const base = {
        NODE_ENV: "test",
        MONGODB_URI: config.mongoUri,
        MONGODB_DB_NAME: config.databaseName,
        JWT_ACCESS_SECRET: config.jwtAccessSecret,
        JWT_ISSUER: config.jwtIssuer,
        JWT_AUDIENCE: config.jwtAudience,
        APP_ORIGINS: origin,
      };
      const unavailableApp = createApp(config);
      const unavailable = await request(unavailableApp).get(
        "/api/internal/email-outbox/process",
      );
      expect(unavailable.status).toBe(503);
      expect(unavailable.body.error.code).toBe("CRON_NOT_CONFIGURED");

      const cronSecret = "synthetic-cron-secret-for-local-tests-123456";
      const cronConfig = (
        await import("../../src/config/env.js")
      ).parseEnvironment({
        ...base,
        CRON_SECRET: cronSecret,
      });
      let databaseCalls = 0;
      const cronApp = createApp(cronConfig, {
        emailService: fakeEmail,
        ensureDatabase: async () => {
          databaseCalls += 1;
        },
      });
      const rejected = await request(cronApp)
        .get("/api/internal/email-outbox/process")
        .set("Authorization", "Bearer incorrect-secret");
      expect(rejected.status).toBe(401);
      expect(databaseCalls).toBe(0);

      const processed = await request(cronApp)
        .get("/api/internal/email-outbox/process")
        .set("Authorization", `Bearer ${cronSecret}`);
      expect(processed.status).toBe(200);
      expect(processed.body.data).toEqual({ processed: 0, batchLimit: 1 });
      expect(databaseCalls).toBe(1);
      expect(processed.headers["cache-control"]).toBe("no-store");
    });

    it("gracefully closes the HTTP listener and disconnects the database", async () => {
      const server = await listenHttp(
        createApp(config, { readiness: () => true }),
        0,
        createLogger("test"),
      );
      const address = server.address();
      if (!address || typeof address === "string")
        throw new Error("Expected a TCP listener address.");
      const response = await fetch(`http://127.0.0.1:${address.port}/health`);
      expect(response.status).toBe(200);
      let disconnectCount = 0;
      const shutdownOrder: string[] = [];
      await closeHttpServer(
        server,
        async () => {
          shutdownOrder.push("database");
          disconnectCount += 1;
        },
        createLogger("test"),
        "TEST",
        async () => {
          shutdownOrder.push("worker");
        },
      );
      expect(disconnectCount).toBe(1);
      expect(shutdownOrder).toEqual(["worker", "database"]);
      await expect(
        fetch(`http://127.0.0.1:${address.port}/health`),
      ).rejects.toBeDefined();
    });

    it("sets secure headers and applies the exact CORS origin allowlist", async () => {
      const allowed = await request(app)
        .get("/api/v1/courses")
        .set("Origin", origin);
      expect(allowed.headers["access-control-allow-origin"]).toBe(origin);
      expect(
        allowed.headers["access-control-allow-credentials"],
      ).toBeUndefined();
      expect(allowed.headers["x-content-type-options"]).toBe("nosniff");
      expect(allowed.headers["x-powered-by"]).toBeUndefined();
      const loginOrigin = await request(app)
        .post("/api/v1/auth/login")
        .set("Origin", origin)
        .send({ email: "unknown@example.test", password: "wrong" });
      expect(loginOrigin.headers["access-control-allow-credentials"]).toBe(
        "true",
      );

      const rejected = await request(app)
        .get("/api/v1/courses")
        .set("Origin", "https://attacker.example");
      expect(rejected.headers["access-control-allow-origin"]).toBeUndefined();

      const deletePreflight = await request(app)
        .options("/api/v1/admin/renewal-plans/660000000000000000000001")
        .set("Origin", origin)
        .set("Access-Control-Request-Method", "DELETE")
        .set("Access-Control-Request-Headers", "authorization");
      expect(deletePreflight.status).toBe(204);
      expect(deletePreflight.headers["access-control-allow-origin"]).toBe(
        origin,
      );
      expect(deletePreflight.headers["access-control-allow-methods"]).toContain(
        "DELETE",
      );
    });

    it("uses the standard error envelope and a generated request ID", async () => {
      const response = await request(app).get("/missing-route");
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("NOT_FOUND");
      expect(response.body.error.details).toEqual([]);
      expect(response.body.requestId).toBe(response.headers["x-request-id"]);
    });

    it("maps malformed and oversized JSON bodies to safe validation errors", async () => {
      const malformed = await request(app)
        .post("/api/v1/auth/register")
        .set("Content-Type", "application/json")
        .send('{"broken":');
      expect(malformed.status).toBe(400);
      expect(malformed.body.error.code).toBe("VALIDATION_ERROR");
      expect(malformed.body).not.toHaveProperty("stack");

      const oversized = await request(app)
        .post("/api/v1/auth/register")
        .set("Content-Type", "application/json")
        .send(JSON.stringify({ pad: "x".repeat(110_000) }));
      expect(oversized.status).toBe(400);
      expect(oversized.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("registration, login, and protected sessions", () => {
    it("registers a Student with a hashed password and does not create a session", async () => {
      const response = await registerUser({
        email: "  STUDENT@EXAMPLE.TEST  ",
      });
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          email: "student@example.test",
          role: "STUDENT",
          status: "ACTIVE",
        },
      });
      expect(response.body.data).not.toHaveProperty("accessToken");
      expect(response.body.data).not.toHaveProperty("passwordHash");
      expect(await UserSession.countDocuments()).toBe(0);
      const stored = await User.findOne({
        email: "student@example.test",
      }).select("+passwordHash");
      expect(stored?.get("passwordHash")).not.toBe(student.password);
      expect(
        await argon2.verify(
          stored!.get("passwordHash") as string,
          student.password,
        ),
      ).toBe(true);
    });

    it("rejects invalid input, role/status injection, and duplicate normalized emails", async () => {
      const invalid = await request(app)
        .post("/api/v1/auth/register")
        .send({ fullName: "", email: "bad", password: "short" });
      expect(invalid.status).toBe(400);
      expect(invalid.body.error.code).toBe("VALIDATION_ERROR");

      const injected = await request(app)
        .post("/api/v1/auth/register")
        .send({ ...student, role: "ADMIN", status: "ACTIVE" });
      expect(injected.status).toBe(400);
      expect(await User.countDocuments()).toBe(0);

      expect((await registerUser()).status).toBe(201);
      const duplicate = await registerUser({ email: "STUDENT@example.test" });
      expect(duplicate.status).toBe(409);
      expect(duplicate.body.error.code).toBe("CONFLICT");
      expect(await User.countDocuments()).toBe(1);
    });

    it("authenticates, sets HttpOnly refresh cookie, and returns one JSON envelope", async () => {
      await registerUser();
      const response = await loginUser();
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe("STUDENT");
      expect(response.body.data).not.toHaveProperty("success");
      expect(response.body.data).not.toHaveProperty("refreshToken");
      expect(cookieFrom(response)).toContain("paniverse_refresh=");
      expect(cookieHeaders(response)[0]).toContain("HttpOnly");
      expect(cookieHeaders(response)[0]).toContain("Path=/api/v1/auth");
      expect(await UserSession.countDocuments({ status: "ACTIVE" })).toBe(1);
    });

    it("rotates a refresh cookie normally and accepts the new access token", async () => {
      await registerUser();
      const login = await loginUser();
      const oldCookie = cookieFrom(login);
      const refreshed = await request(app)
        .post("/api/v1/auth/refresh")
        .set("Origin", origin)
        .set("X-CSRF-Protection", "1")
        .set("Cookie", oldCookie);
      expect(refreshed.status).toBe(200);
      expect(cookieFrom(refreshed)).not.toBe(oldCookie);
      expect(
        (
          await request(app)
            .get("/api/v1/auth/me")
            .set("Authorization", `Bearer ${refreshed.body.data.accessToken}`)
        ).status,
      ).toBe(200);
      const session = await UserSession.findOne({ status: "ACTIVE" }).select(
        "+refreshTokenHash +previousRefreshTokenHashes",
      );
      expect(session?.get("previousRefreshTokenHashes")).toHaveLength(1);
    });

    it("returns generic credential errors and rejects blocked accounts", async () => {
      await registerUser();
      const wrongPassword = await loginUser(student.email, "WrongPassword123!");
      const unknownEmail = await loginUser(
        "unknown@example.test",
        "WrongPassword123!",
      );
      expect(wrongPassword.status).toBe(401);
      expect(unknownEmail.status).toBe(401);
      expect(wrongPassword.body.error.message).toBe(
        unknownEmail.body.error.message,
      );

      await User.updateOne(
        { email: student.email },
        { $set: { status: "BLOCKED" } },
      );
      const blocked = await loginUser();
      expect(blocked.status).toBe(403);
      expect(blocked.body.error.code).toBe("ACCOUNT_BLOCKED");

      await User.updateOne(
        { email: student.email },
        { $set: { status: "ACTIVE" } },
      );
      const activeLogin = await loginUser();
      await User.updateOne(
        { email: student.email },
        { $set: { status: "BLOCKED" } },
      );
      const blockedProtected = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${activeLogin.body.data.accessToken}`);
      expect(blockedProtected.status).toBe(403);
      expect(blockedProtected.body.error.code).toBe("ACCOUNT_BLOCKED");
    });

    it("replaces the prior active Student session atomically on a second login", async () => {
      await registerUser();
      const first = await loginUser();
      const second = await loginUser();
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      const sessions = await UserSession.find({
        userId: first.body.data.user.id,
      });
      expect(
        sessions.filter((session) => session.get("status") === "ACTIVE"),
      ).toHaveLength(1);
      expect(
        sessions.filter((session) => session.get("status") === "REVOKED"),
      ).toHaveLength(1);
      const oldAccess = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${first.body.data.accessToken}`);
      expect(oldAccess.status).toBe(401);
      expect(oldAccess.body.error.code).toBe("SESSION_REVOKED");
      expect(
        (
          await request(app)
            .get("/api/v1/auth/me")
            .set("Authorization", `Bearer ${second.body.data.accessToken}`)
        ).status,
      ).toBe(200);
    });

    it("keeps at most one active Student session under concurrent logins", async () => {
      await registerUser();
      const responses = await Promise.all([loginUser(), loginUser()]);
      expect(responses.map((response) => response.status)).toEqual([200, 200]);
      expect(
        await UserSession.countDocuments({
          status: "ACTIVE",
          roleAtIssue: "STUDENT",
        }),
      ).toBe(1);
      const sessions = await UserSession.find({ roleAtIssue: "STUDENT" });
      expect(sessions.length).toBe(2);
      expect(
        sessions.filter((session) => session.get("status") === "ACTIVE"),
      ).toHaveLength(1);
    });

    it("validates JWT claims, owner, expiry, user status, and current session state on every protected request", async () => {
      await registerUser();
      const login = await loginUser();
      const token = login.body.data.accessToken as string;
      const claims = await verifyAccessToken(config, token);
      expect(claims).toMatchObject({
        sub: login.body.data.user.id,
        role: "STUDENT",
      });

      const otherUser = await User.create({
        fullName: "Other",
        email: "other@example.test",
        passwordHash: await argon2.hash("OtherTestPassword123!"),
        role: "STUDENT",
        status: "ACTIVE",
      });
      const wrongOwnerSession = await UserSession.create({
        userId: otherUser._id,
        refreshTokenHash: "hash-not-used",
        roleAtIssue: "STUDENT",
        status: "ACTIVE",
        expiresAt: new Date(Date.now() + 60_000),
      });
      const wrongOwnerToken = await new SignJWT({
        sid: wrongOwnerSession.id,
        role: "STUDENT",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(login.body.data.user.id)
        .setIssuer(config.jwtIssuer)
        .setAudience(config.jwtAudience)
        .setIssuedAt()
        .setExpirationTime("5m")
        .setJti("wrong-owner")
        .sign(new TextEncoder().encode(config.jwtAccessSecret));
      expect(
        (
          await request(app)
            .get("/api/v1/auth/me")
            .set("Authorization", `Bearer ${wrongOwnerToken}`)
        ).status,
      ).toBe(401);

      const expiredToken = await new SignJWT({
        sid: claims.sid,
        role: claims.role,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(claims.sub)
        .setIssuer(config.jwtIssuer)
        .setAudience(config.jwtAudience)
        .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
        .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
        .setJti("expired-token")
        .sign(new TextEncoder().encode(config.jwtAccessSecret));
      expect(
        (
          await request(app)
            .get("/api/v1/auth/me")
            .set("Authorization", `Bearer ${expiredToken}`)
        ).status,
      ).toBe(401);

      const wrongAlgorithmToken = await new SignJWT({
        sid: claims.sid,
        role: claims.role,
      })
        .setProtectedHeader({ alg: "HS384" })
        .setSubject(claims.sub)
        .setIssuer(config.jwtIssuer)
        .setAudience(config.jwtAudience)
        .setIssuedAt()
        .setExpirationTime("5m")
        .setJti("wrong-algorithm")
        .sign(new TextEncoder().encode(config.jwtAccessSecret));
      expect(
        (
          await request(app)
            .get("/api/v1/auth/me")
            .set("Authorization", `Bearer ${wrongAlgorithmToken}`)
        ).status,
      ).toBe(401);

      await UserSession.updateOne(
        { _id: claims.sid },
        { $set: { expiresAt: new Date(Date.now() - 1) } },
      );
      const expiredSession = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`);
      expect(expiredSession.status).toBe(401);
      expect(expiredSession.body.error.code).toBe("SESSION_REVOKED");
    });

    it("rotates refresh credentials and revokes a session when an old token is replayed concurrently", async () => {
      await registerUser();
      const login = await loginUser();
      const oldCookie = cookieFrom(login);
      const refresh = () =>
        request(app)
          .post("/api/v1/auth/refresh")
          .set("Origin", origin)
          .set("X-CSRF-Protection", "1")
          .set("Cookie", oldCookie);
      const [first, replay] = await Promise.all([refresh(), refresh()]);
      expect([first.status, replay.status].sort()).toEqual([200, 401]);
      const failed = first.status === 401 ? first : replay;
      expect(failed.body.error.code).toBe("SESSION_REVOKED");
      const successful = first.status === 200 ? first : replay;
      expect(successful.body.data).not.toHaveProperty("refreshToken");
      expect(successful.body.data).not.toHaveProperty("success");
      expect(await UserSession.countDocuments({ status: "ACTIVE" })).toBe(0);
      const staleAccess = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${successful.body.data.accessToken}`);
      expect(staleAccess.status).toBe(401);
    });

    it("requires exact Origin and the CSRF custom header for refresh and logout", async () => {
      await registerUser();
      const login = await loginUser();
      const cookie = cookieFrom(login);
      const rejected = await request(app)
        .post("/api/v1/auth/refresh")
        .set("Origin", "https://attacker.example")
        .set("X-CSRF-Protection", "1")
        .set("Cookie", cookie);
      expect(rejected.status).toBe(403);
      expect(rejected.body.error.code).toBe("CSRF_REJECTED");
      const missingHeader = await request(app)
        .post("/api/v1/auth/logout")
        .set("Origin", origin)
        .set("Authorization", `Bearer ${login.body.data.accessToken}`);
      expect(missingHeader.status).toBe(403);
    });

    it("makes logout repeat-safe, clears the refresh cookie, and rejects the revoked access JWT", async () => {
      await registerUser();
      const login = await loginUser();
      const performLogout = () =>
        request(app)
          .post("/api/v1/auth/logout")
          .set("Origin", origin)
          .set("X-CSRF-Protection", "1")
          .set("Authorization", `Bearer ${login.body.data.accessToken}`);
      const first = await performLogout();
      const second = await performLogout();
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(cookieHeaders(first)[0]).toContain("paniverse_refresh=;");
      const protectedRequest = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${login.body.data.accessToken}`);
      expect(protectedRequest.status).toBe(401);
    });

    it("rejects anonymous and Student access to the Admin role guard", async () => {
      const anonymous = await request(app).get("/api/v1/auth/__test/admin");
      expect(anonymous.status).toBe(401);
      await registerUser();
      const studentLogin = await loginUser();
      const studentDenied = await request(app)
        .get("/api/v1/auth/__test/admin")
        .set("Authorization", `Bearer ${studentLogin.body.data.accessToken}`);
      expect(studentDenied.status).toBe(403);

      const admin = await User.create({
        fullName: "Test Admin",
        email: "admin@example.test",
        passwordHash: await argon2.hash("AdminTestPassword123!"),
        role: "ADMIN",
        status: "ACTIVE",
      });
      const adminLogin = await loginUser(
        admin.get("email") as string,
        "AdminTestPassword123!",
      );
      expect(adminLogin.status).toBe(200);
      const adminAllowed = await request(app)
        .get("/api/v1/auth/__test/admin")
        .set("Authorization", `Bearer ${adminLogin.body.data.accessToken}`);
      expect(adminAllowed.status).toBe(200);
      const secondAdminLogin = await loginUser(
        admin.get("email") as string,
        "AdminTestPassword123!",
      );
      expect(secondAdminLogin.status).toBe(200);
      expect(
        await UserSession.countDocuments({
          userId: admin._id,
          status: "ACTIVE",
          roleAtIssue: "ADMIN",
        }),
      ).toBe(2);
    });
  });

  describe("password reset", () => {
    it("rejects expired reset tokens", async () => {
      const passwordHash = await argon2.hash(student.password);
      const user = await User.create({
        fullName: student.fullName,
        email: student.email,
        passwordHash,
        role: "STUDENT",
        status: "ACTIVE",
      });
      const token = "expired-reset-token-0000000000000000000000000000";
      const tokenHash = createHash("sha256").update(token).digest("hex");
      await PasswordResetToken.create({
        userId: user._id,
        tokenHash,
        expiresAt: new Date(Date.now() - 1),
        consumedAt: null,
      });

      const response = await request(app)
        .post("/api/v1/auth/password/reset")
        .send({ token, newPassword: "ACompletelyNew123!" });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("RESET_TOKEN_INVALID");
      const stored = await User.findById(user._id).select("+passwordHash");
      expect(
        await argon2.verify(
          stored!.get("passwordHash") as string,
          student.password,
        ),
      ).toBe(true);
    });

    it("keeps forgot-password responses generic and consumes a one-time token while revoking sessions", async () => {
      await registerUser();
      const login = await loginUser();
      const known = await request(app)
        .post("/api/v1/auth/password/forgot")
        .send({ email: student.email });
      const unknown = await request(app)
        .post("/api/v1/auth/password/forgot")
        .send({ email: "unknown@example.test" });
      expect(known.status).toBe(200);
      expect(known.body).toEqual(unknown.body);
      expect(JSON.stringify(known.body)).not.toContain("token");
      expect(fakeEmail.deliveries).toHaveLength(1);

      const rawToken = new URL(
        fakeEmail.deliveries[0]!.resetUrl,
      ).searchParams.get("token")!;
      const stored = await PasswordResetToken.findOne({}).select("+tokenHash");
      expect(stored?.get("tokenHash")).not.toBe(rawToken);
      const resetBody = { token: rawToken, newPassword: "ACompletelyNew123!" };
      expect(
        (await request(app).post("/api/v1/auth/password/reset").send(resetBody))
          .status,
      ).toBe(200);
      const replay = await request(app)
        .post("/api/v1/auth/password/reset")
        .send(resetBody);
      expect(replay.status).toBe(400);
      expect(replay.body.error.code).toBe("RESET_TOKEN_INVALID");

      const revoked = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${login.body.data.accessToken}`);
      expect(revoked.status).toBe(401);
      expect(
        (await loginUser(student.email, "ACompletelyNew123!")).status,
      ).toBe(200);
    });

    it("returns the same generic response when production mail delivery is unavailable", async () => {
      const production = {
        ...config,
        nodeEnv: "production" as const,
        smtp: undefined,
        cookieSecure: true,
      };
      const noMailApp = createApp(production, {
        logger: createLogger("test"),
        readiness: () => true,
      });
      await registerUser();
      const result = await request(noMailApp)
        .post("/api/v1/auth/password/forgot")
        .send({ email: student.email });
      expect(result.status).toBe(200);
      expect(result.body.data.message).toMatch(/If an account exists/);
      expect(await PasswordResetToken.countDocuments()).toBe(0);
    });
  });

  describe("public course catalog", () => {
    it("lists only published non-deleted courses with stable pagination and exact money strings", async () => {
      await createPublishedCourse({
        price: "900719925474099312345",
        slug: "large-price",
      });
      await Course.create({
        code: "DRAFT-01",
        title: "Draft",
        slug: "draft-course",
        description: "Draft",
        shortDescription: "",
        objectives: [],
        requirements: [],
        level: "A1",
        price: mongoose.Types.Decimal128.fromString("1000"),
        accessDurationMonths: 3,
        status: "DRAFT",
        sortOrder: 2,
        deletedAt: null,
      });
      await Course.create({
        code: "ARCHIVE-01",
        title: "Archived",
        slug: "archived-course",
        description: "Archived",
        shortDescription: "",
        objectives: [],
        requirements: [],
        level: "A1",
        price: mongoose.Types.Decimal128.fromString("1000"),
        accessDurationMonths: 3,
        status: "ARCHIVED",
        sortOrder: 3,
        deletedAt: null,
      });
      await Course.create({
        code: "DELETED-01",
        title: "Deleted",
        slug: "deleted-course",
        description: "Deleted",
        shortDescription: "",
        objectives: [],
        requirements: [],
        level: "A1",
        price: mongoose.Types.Decimal128.fromString("1000"),
        accessDurationMonths: 3,
        status: "PUBLISHED",
        sortOrder: 4,
        deletedAt: new Date(),
      });
      const response = await request(app).get(
        "/api/v1/courses?page=1&pageSize=1&sort=price_desc",
      );
      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].price).toBe("900719925474099312345");
      expect(response.body.data.total).toBe(1);
      expect(response.body.data.hasMore).toBe(false);
    });

    it("returns an explicit published outline and omits hidden, deleted, and protected lesson content", async () => {
      const course = await createPublishedCourse({ price: "1950000" });
      const section = await CourseSection.create({
        courseId: course._id,
        title: "Chapter 1",
        description: "Basics",
        sectionType: "CHAPTER",
        sortOrder: 1,
        status: "PUBLISHED",
        deletedAt: null,
      });
      const hiddenSection = await CourseSection.create({
        courseId: course._id,
        title: "Hidden section",
        sectionType: "CHAPTER",
        sortOrder: 2,
        status: "HIDDEN",
        deletedAt: null,
      });
      await Lesson.create({
        sectionId: section._id,
        title: "Greetings",
        description: "Say hello.",
        content: { answerKey: "private" },
        lessonType: "LECTURE",
        estimatedMinutes: 10,
        countsTowardProgress: true,
        sortOrder: 1,
        status: "PUBLISHED",
        deletedAt: null,
      });
      await Lesson.create({
        sectionId: section._id,
        title: "Draft lesson",
        content: { secret: true },
        lessonType: "PRACTICE",
        sortOrder: 2,
        status: "DRAFT",
        deletedAt: null,
      });
      await Lesson.create({
        sectionId: hiddenSection._id,
        title: "Hidden lesson",
        content: { secret: true },
        lessonType: "PRACTICE",
        sortOrder: 1,
        status: "PUBLISHED",
        deletedAt: null,
      });
      await Lesson.create({
        sectionId: section._id,
        title: "Deleted lesson",
        content: { secret: true },
        lessonType: "PRACTICE",
        sortOrder: 3,
        status: "PUBLISHED",
        deletedAt: new Date(),
      });

      const response = await request(app).get("/api/v1/courses/german-a1");
      expect(response.status).toBe(200);
      expect(response.body.data.sections).toHaveLength(1);
      expect(response.body.data.sections[0].title).toBe("Chapter 1");
      expect(
        response.body.data.sections[0].lessons.map(
          (lesson: { title: string }) => lesson.title,
        ),
      ).toEqual(["Greetings"]);
      expect(response.body.data.sections[0].lessons[0]).not.toHaveProperty(
        "content",
      );
      expect(JSON.stringify(response.body)).not.toContain("answerKey");
      expect(JSON.stringify(response.body)).not.toContain("secret");
      expect(
        (await request(app).get("/api/v1/courses/not-a-course")).status,
      ).toBe(404);
    });

    it("supports search and filters and returns an empty page for no matches", async () => {
      await createPublishedCourse({ slug: "german-a1" });
      await createPublishedCourse({ slug: "german-a2" }).then((course) =>
        Course.updateOne({ _id: course._id }, { $set: { level: "A2" } }),
      );
      const filtered = await request(app).get(
        "/api/v1/courses?q=German&level=A2",
      );
      expect(filtered.status).toBe(200);
      expect(
        filtered.body.data.items.map((course: { slug: string }) => course.slug),
      ).toEqual(["german-a2"]);
      const empty = await request(app).get("/api/v1/courses?q=no-match");
      expect(empty.body.data.items).toEqual([]);
      expect(empty.body.data.total).toBe(0);
    });
  });

  describe("public site settings and media", () => {
    it("returns only allowlisted public settings and hides payment configuration", async () => {
      const hero = await createMedia("PUBLIC");
      await SiteSettings.create({
        _id: "site",
        siteName: "PAniverseDeutsch",
        logoAssetId: null,
        heroTitle: "Learn German",
        heroDescription: "Practice daily.",
        heroAssetId: hero._id,
        contactEmail: "hello@example.test",
        contactPhone: null,
        facebookUrl: null,
        zaloUrl: null,
        footerDescription: "Footer copy.",
        payment: { bankName: "private bank", accountNumber: "123456789" },
        updatedAt: new Date(),
      });
      const response = await request(app).get("/api/v1/site-settings/public");
      expect(response.status).toBe(200);
      expect(response.body.data.siteName).toBe("PAniverseDeutsch");
      expect(response.body.data.heroMedia.id).toBe(hero.id);
      expect(response.body.data).not.toHaveProperty("payment");
      expect(JSON.stringify(response.body)).not.toContain("123456789");
    });

    it("exposes metadata only for public media associated with published content or site settings", async () => {
      const publicAsset = await createMedia("PUBLIC");
      await createPublishedCourse({ thumbnailAssetId: publicAsset._id });
      const privateAsset = await createMedia("ENROLLED");
      const unrelatedPublicAsset = await createMedia("PUBLIC");

      const publicResponse = await request(app).get(
        `/api/v1/media/${publicAsset.id}/metadata`,
      );
      expect(publicResponse.status).toBe(200);
      expect(publicResponse.body.data).toMatchObject({
        id: publicAsset.id,
        mediaType: "IMAGE",
        mimeType: "image/jpeg",
      });
      expect(JSON.stringify(publicResponse.body)).not.toContain("storageKey");
      expect(JSON.stringify(publicResponse.body)).not.toContain(
        "secret/bucket/",
      );
      expect(
        (await request(app).get(`/api/v1/media/${privateAsset.id}/metadata`))
          .status,
      ).toBe(404);
      expect(
        (
          await request(app).get(
            `/api/v1/media/${unrelatedPublicAsset.id}/metadata`,
          )
        ).status,
      ).toBe(404);
      expect(
        (
          await request(app).get(
            `/api/v1/media/${new mongoose.Types.ObjectId()}/metadata`,
          )
        ).status,
      ).toBe(404);
      expect(
        (await request(app).get("/api/v1/media/not-an-object-id/metadata"))
          .status,
      ).toBe(400);
    });

    it("returns 404 when public site settings are not initialized", async () => {
      const response = await request(app).get("/api/v1/site-settings/public");
      expect(response.status).toBe(404);
    });
  });
});
