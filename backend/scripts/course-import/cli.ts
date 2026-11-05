import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../../src/application.js";
import type { AppConfig } from "../../src/config/env.js";
import { Enrollment } from "../../src/db/models/index.js";
import { createLogger } from "../../src/http/logger.js";
import { FakeEmailService } from "../../src/modules/auth/email-service.js";
import { UnconfiguredMediaStorage } from "../../src/modules/learning/media-storage.js";
import { STAGING_DATABASE_NAME, courseImportManifest } from "./manifest.js";
import {
  applyCourseImport,
  buildCourseImportPlan,
  CourseImportConflict,
  summarizeCourseImportPlan,
  verifyCourseImport,
} from "./workflow.js";

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  const mode = flags.get("mode");
  const targetDb = flags.get("target-db");
  if (mode !== "dry-run" && mode !== "apply" && mode !== "verify")
    throw new SafeCliError(
      "INVALID_MODE",
      "Use --mode dry-run, apply, or verify.",
    );
  if (!targetDb)
    throw new SafeCliError(
      "TARGET_REQUIRED",
      "Provide --target-db explicitly.",
    );
  if (targetDb !== STAGING_DATABASE_NAME)
    throw new SafeCliError(
      "TARGET_REJECTED",
      "Only the user-confirmed staging database is allowed.",
    );
  if (process.env.MONGODB_DB_NAME !== targetDb)
    throw new SafeCliError(
      "DATABASE_ENV_MISMATCH",
      "MONGODB_DB_NAME must exactly match the confirmed target.",
    );
  const uri = process.env.MONGODB_URI;
  if (!uri)
    throw new SafeCliError("MONGODB_URI_MISSING", "MONGODB_URI is required.");
  const host = getMongoHost(uri);
  if (host !== "cluster0.arsopo1.mongodb.net")
    throw new SafeCliError(
      "CLUSTER_REJECTED",
      "MongoDB URI does not match the user-confirmed staging cluster.",
    );

  try {
    await mongoose.connect(uri, {
      dbName: targetDb,
      autoIndex: false,
      serverSelectionTimeoutMS: 8_000,
      appName: "paniverse-lms-be-08a-course-import",
    });
    const database = mongoose.connection.db;
    if (!database || mongoose.connection.name !== targetDb)
      throw new SafeCliError(
        "DATABASE_UNVERIFIED",
        "Connected database name did not match the approved staging target.",
      );
    const hello = await database.admin().command({ hello: 1 });
    if (typeof hello.setName !== "string" || !hello.setName)
      throw new SafeCliError(
        "TRANSACTIONS_UNAVAILABLE",
        "The target does not report replica-set transaction support.",
      );
    const connectionStatus = await database.admin().command({
      connectionStatus: 1,
      showPrivileges: true,
    });
    if (!hasRequiredPrivileges(connectionStatus, targetDb))
      throw new SafeCliError(
        "WRITE_ACCESS_UNVERIFIED",
        `Required privileges are not confirmed: ${JSON.stringify(permissionSummary(connectionStatus))}`,
      );

    if (mode === "dry-run") {
      const plan = await buildCourseImportPlan();
      print({
        mode,
        databaseName: targetDb,
        databaseConnected: true,
        writeAccessVerified: true,
        transactionSupportVerified: true,
        plan: summarizeCourseImportPlan(plan),
      });
      if (plan.conflicts.length) process.exitCode = 2;
      return;
    }
    if (mode === "verify") {
      const report = await verifyCourseImport();
      const catalogApi = await verifyPublicCatalogApi(report.courseId);
      const activeEnrollmentCount = await Enrollment.countDocuments({
        courseId: new mongoose.Types.ObjectId(report.courseId),
        status: "ACTIVE",
        expiresAt: { $gt: new Date() },
      });
      print({
        mode,
        databaseName: targetDb,
        databaseConnected: true,
        report,
        catalogApi,
        learningApiVerified: false,
        learningApiNote:
          activeEnrollmentCount > 0
            ? "A real active enrollment exists; learning API verification requires a matching active student session."
            : "No active enrollment exists; no student or enrollment was created for verification.",
      });
      return;
    }

    const before = await buildCourseImportPlan();
    if (before.conflicts.length)
      throw new CourseImportConflict(before.conflicts);
    const report = await applyCourseImport();
    const idempotencyPlan = await buildCourseImportPlan();
    if (
      idempotencyPlan.conflicts.length ||
      idempotencyPlan.courseAction !== "skip" ||
      idempotencyPlan.sections.some((section) => section.action !== "skip") ||
      idempotencyPlan.lessons.some((lesson) => lesson.action !== "skip")
    )
      throw new SafeCliError(
        "IDEMPOTENCY_CHECK_FAILED",
        "A second read found additional import work or conflicts.",
      );
    const catalogApi = await verifyPublicCatalogApi(report.courseId);
    const activeEnrollmentCount = await Enrollment.countDocuments({
      courseId: new mongoose.Types.ObjectId(report.courseId),
      status: "ACTIVE",
      expiresAt: { $gt: new Date() },
    });
    print({
      mode,
      databaseName: targetDb,
      databaseConnected: true,
      transactionSupportVerified: true,
      businessValues: {
        priceVnd: courseImportManifest.course.price,
        accessDurationMonths: courseImportManifest.course.accessDurationMonths,
      },
      report,
      idempotencyVerified: true,
      catalogApi,
      learningApiVerified: false,
      learningApiNote:
        activeEnrollmentCount > 0
          ? "A real active enrollment exists; learning API verification requires a matching active student session."
          : "No active enrollment exists; no student or enrollment was created for verification.",
    });
  } finally {
    await mongoose.disconnect();
  }
}

async function verifyPublicCatalogApi(courseId: string) {
  const config: AppConfig = {
    nodeEnv: "test",
    port: 4100,
    mongoUri: "mongodb://127.0.0.1/paniverse_lms_api_verification",
    databaseName: STAGING_DATABASE_NAME,
    jwtAccessSecret: "local-api-verification-secret-only-32-chars",
    jwtIssuer: "https://api.verification.invalid",
    jwtAudience: "paniverse-api-verification",
    accessTokenTtlSeconds: 900,
    sessionTtlDays: 30,
    allowedOrigins: [],
    cookieSecure: false,
    cookieSameSite: "lax",
    passwordResetUrl: undefined,
    smtp: undefined,
    mediaStorage: undefined,
    mediaProvider: undefined,
    cloudinaryMedia: undefined,
  };
  const app = createApp(config, {
    logger: createLogger("test"),
    emailService: new FakeEmailService(),
    mediaStorage: new UnconfiguredMediaStorage(),
    readiness: () => true,
  });
  const response = await request(app).get(
    `/api/v1/courses/${courseImportManifest.course.slug}`,
  );
  const data = response.body?.data as
    | {
        id?: unknown;
        title?: unknown;
        price?: unknown;
        accessDurationMonths?: unknown;
        sections?: Array<{ title?: unknown; lessons?: unknown[] }>;
      }
    | undefined;
  const sectionTitles =
    data?.sections?.map((section) => String(section.title)) ?? [];
  const lessonCount =
    data?.sections?.reduce(
      (total, section) =>
        total + (Array.isArray(section.lessons) ? section.lessons.length : 0),
      0,
    ) ?? 0;
  if (
    response.status !== 200 ||
    data?.id !== courseId ||
    data.title !== courseImportManifest.course.title ||
    data.price !== courseImportManifest.course.price ||
    data.accessDurationMonths !==
      courseImportManifest.course.accessDurationMonths ||
    JSON.stringify(sectionTitles) !==
      JSON.stringify(["Lektion 1", "Lektion 2"]) ||
    lessonCount !== 9
  )
    throw new SafeCliError(
      "CATALOG_API_VERIFICATION_FAILED",
      "Public Catalog API did not return the imported A1.1 course tree.",
    );
  const hasPublicYouTubeIds = data.sections?.some((section) =>
    section.lessons?.some(
      (lesson) =>
        typeof lesson === "object" && lesson !== null && "video" in lesson,
    ),
  );
  if (hasPublicYouTubeIds)
    throw new SafeCliError(
      "CATALOG_VIDEO_VISIBILITY_FAILED",
      "Public Catalog API unexpectedly returned lesson video data.",
    );
  return {
    verified: true,
    status: response.status,
    sections: sectionTitles.length,
    lessons: lessonCount,
  };
}

function parseFlags(args: string[]): Map<string, string> {
  const flags = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (!current?.startsWith("--"))
      throw new SafeCliError(
        "INVALID_ARGUMENT",
        "Arguments must use named flags.",
      );
    const name = current.slice(2);
    const value = args[index + 1];
    if (!value || value.startsWith("--") || flags.has(name))
      throw new SafeCliError(
        "INVALID_ARGUMENT",
        "Each flag must have one unique value.",
      );
    if (name !== "mode" && name !== "target-db")
      throw new SafeCliError("INVALID_ARGUMENT", "Unknown course-import flag.");
    flags.set(name, value);
    index += 1;
  }
  return flags;
}

function getMongoHost(uri: string): string {
  try {
    const normalized = uri
      .replace(/^mongodb\+srv:/, "https:")
      .replace(/^mongodb:/, "http:");
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    throw new SafeCliError(
      "MONGODB_URI_INVALID",
      "MONGODB_URI could not be parsed.",
    );
  }
}

function hasRequiredPrivileges(status: unknown, database: string): boolean {
  if (!status || typeof status !== "object") return false;
  const authInfo = (status as { authInfo?: unknown }).authInfo;
  if (!authInfo || typeof authInfo !== "object") return false;
  const roleRows = (authInfo as { authenticatedUserRoles?: unknown })
    .authenticatedUserRoles;
  if (Array.isArray(roleRows)) {
    const knownWriteRole = roleRows.some((entry) => {
      if (!entry || typeof entry !== "object") return false;
      const role = entry as { role?: unknown; db?: unknown };
      return (
        (role.db === database &&
          ["readWrite", "dbOwner"].includes(String(role.role))) ||
        (role.db === "admin" &&
          ["readWriteAnyDatabase", "root"].includes(String(role.role)))
      );
    });
    if (knownWriteRole) return true;
  }
  const privileges = (authInfo as { authenticatedUserPrivileges?: unknown })
    .authenticatedUserPrivileges;
  if (!Array.isArray(privileges)) return false;
  const required = [
    ["courses", "find"],
    ["courses", "insert"],
    ["courses", "update"],
    ["course_sections", "find"],
    ["course_sections", "insert"],
    ["course_sections", "update"],
    ["lessons", "find"],
    ["lessons", "insert"],
    ["lessons", "update"],
    ["audit_logs", "insert"],
  ] as const;
  return required.every(([collection, action]) =>
    privileges.some((entry) => {
      if (!entry || typeof entry !== "object") return false;
      const privilege = entry as {
        resource?: { db?: string; collection?: string };
        actions?: unknown;
      };
      const resource = privilege.resource;
      const actions = Array.isArray(privilege.actions) ? privilege.actions : [];
      const databaseMatches =
        resource?.db === database ||
        resource?.db === "*" ||
        resource?.db === "";
      const collectionMatches =
        resource?.collection === "" || resource?.collection === collection;
      return (
        databaseMatches &&
        collectionMatches &&
        (actions.includes(action) || actions.includes("any"))
      );
    }),
  );
}

function permissionSummary(status: unknown) {
  if (!status || typeof status !== "object") return { authInfo: "unavailable" };
  const authInfo = (status as { authInfo?: unknown }).authInfo;
  if (!authInfo || typeof authInfo !== "object")
    return { authInfo: "unavailable" };
  const info = authInfo as {
    authenticatedUserRoles?: unknown;
    authenticatedUserPrivileges?: unknown;
  };
  const roles = Array.isArray(info.authenticatedUserRoles)
    ? info.authenticatedUserRoles.map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const row = entry as { role?: unknown; db?: unknown };
        return { role: row.role ?? null, database: row.db ?? null };
      })
    : [];
  const privileges = Array.isArray(info.authenticatedUserPrivileges)
    ? info.authenticatedUserPrivileges
    : [];
  const broadWritePrivilege = privileges.some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const row = entry as {
      resource?: { db?: unknown; collection?: unknown };
      actions?: unknown;
    };
    const actions = Array.isArray(row.actions) ? row.actions : [];
    return (
      (row.resource?.db === "" || row.resource?.db === "*") &&
      row.resource?.collection === "" &&
      ["find", "insert", "update"].every((action) => actions.includes(action))
    );
  });
  return { roles, privilegeEntries: privileges.length, broadWritePrivilege };
}

class SafeCliError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function print(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

main().catch((error: unknown) => {
  if (error instanceof CourseImportConflict) {
    console.error(
      JSON.stringify({ code: error.code, conflicts: error.conflicts }, null, 2),
    );
  } else if (error instanceof SafeCliError) {
    console.error(
      JSON.stringify({ code: error.code, message: error.message }, null, 2),
    );
  } else {
    const maybe = error as { name?: string; code?: string | number };
    console.error(
      JSON.stringify(
        {
          code: "COURSE_IMPORT_FAILED",
          errorName: maybe?.name ?? "UnknownError",
          databaseErrorCode: maybe?.code ?? null,
          message:
            "Import failed. Sensitive connection details were suppressed.",
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  }
});
