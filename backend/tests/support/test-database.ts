import { MongoMemoryReplSet } from "mongodb-memory-server";
import { parseEnvironment, type AppConfig } from "../../src/config/env.js";
import { connectMongo, disconnectMongo } from "../../src/db/connection.js";
import { ensureIndexes } from "../../src/db/ensure-indexes.js";
import {
  AuditLog,
  BootstrapMarker,
  Course,
  CourseSection,
  Coupon,
  CouponRedemption,
  EmailLog,
  Enrollment,
  EnrollmentAdjustment,
  Exercise,
  ExerciseAsset,
  ExerciseProgress,
  Lesson,
  LessonAsset,
  LessonNote,
  LessonProgress,
  LoginEvent,
  MediaAsset,
  Order,
  PasswordResetToken,
  Quiz,
  QuizAttempt,
  RenewalPlan,
  SiteSettings,
  User,
  UserSession,
} from "../../src/db/models/index.js";

let replicaSet: MongoMemoryReplSet | undefined;
let appConfig: AppConfig | undefined;

export async function startTestDatabase(): Promise<AppConfig> {
  if (replicaSet && appConfig) return appConfig;
  replicaSet = await MongoMemoryReplSet.create({
    binary: { version: "8.0.34" },
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  appConfig = parseEnvironment({
    NODE_ENV: "test",
    PORT: "4100",
    MONGODB_URI: replicaSet.getUri(),
    MONGODB_DB_NAME: "paniverse_lms_be01_test",
    JWT_ACCESS_SECRET: "test-only-signing-secret-at-least-32-chars",
    JWT_ISSUER: "https://api.test.paniverse.invalid",
    JWT_AUDIENCE: "paniverse-test-client",
    ACCESS_TOKEN_TTL_SECONDS: "900",
    SESSION_TTL_DAYS: "30",
    APP_ORIGINS: "http://localhost:5173",
    COOKIE_SECURE: "false",
    COOKIE_SAME_SITE: "lax",
  });
  await connectMongo(appConfig);
  await ensureIndexes();
  return appConfig;
}

export async function clearTestDatabase(): Promise<void> {
  await Promise.all([
    AuditLog.deleteMany({}),
    BootstrapMarker.deleteMany({}),
    Course.deleteMany({}),
    CourseSection.deleteMany({}),
    Coupon.deleteMany({}),
    CouponRedemption.deleteMany({}),
    Enrollment.deleteMany({}),
    EnrollmentAdjustment.deleteMany({}),
    Order.deleteMany({}),
    EmailLog.deleteMany({}),
    Exercise.deleteMany({}),
    ExerciseAsset.deleteMany({}),
    ExerciseProgress.deleteMany({}),
    Lesson.deleteMany({}),
    LessonAsset.deleteMany({}),
    LessonNote.deleteMany({}),
    LessonProgress.deleteMany({}),
    LoginEvent.deleteMany({}),
    MediaAsset.deleteMany({}),
    PasswordResetToken.deleteMany({}),
    Quiz.deleteMany({}),
    QuizAttempt.deleteMany({}),
    RenewalPlan.deleteMany({}),
    SiteSettings.deleteMany({}),
    User.deleteMany({}),
    UserSession.deleteMany({}),
  ]);
}

export async function stopTestDatabase(): Promise<void> {
  await disconnectMongo();
  await replicaSet?.stop();
  replicaSet = undefined;
  appConfig = undefined;
}
