import argon2 from "argon2";
import { createServer } from "node:http";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { parseEnvironment } from "../src/config/env.js";
import { connectMongo, disconnectMongo } from "../src/db/connection.js";
import {
  Course,
  CourseSection,
  Coupon,
  Enrollment,
  Exercise,
  ExerciseAsset,
  Lesson,
  MediaAsset,
  Quiz,
  RenewalPlan,
  SiteSettings,
  User,
} from "../src/db/models/index.js";
import { createApp } from "../src/application.js";
import { FakeEmailService } from "../src/modules/auth/email-service.js";
import { ensureIndexes } from "../src/db/ensure-indexes.js";

const apiPort = 4141;
const controlPort = 4142;
const webOrigin = "http://127.0.0.1:4173";
const controlToken = "BE05-LOCAL-RESET-ONLY-6f3bf983";
const testPassword = "BE04-Isolated-Test-123!";
const fixtureIds = {
  student: "660000000000000000000001",
  admin: "660000000000000000000002",
  course: "660000000000000000000003",
  section: "660000000000000000000004",
  lesson: "660000000000000000000005",
  fileExercise: "660000000000000000000006",
  quizExercise: "660000000000000000000007",
  answerPdf: "660000000000000000000008",
  courseB: "660000000000000000000009",
  courseC: "66000000000000000000000a",
  studentB: "66000000000000000000000b",
  renewalActive: "66000000000000000000000c",
  renewalExpired: "66000000000000000000000d",
  renewalRevoked: "66000000000000000000000e",
};

async function seedFixtures() {
  const passwordHash = await argon2.hash(testPassword);
  const student = new mongoose.Types.ObjectId(fixtureIds.student);
  const admin = new mongoose.Types.ObjectId(fixtureIds.admin);
  const course = new mongoose.Types.ObjectId(fixtureIds.course);
  const section = new mongoose.Types.ObjectId(fixtureIds.section);
  const lesson = new mongoose.Types.ObjectId(fixtureIds.lesson);
  const fileExercise = new mongoose.Types.ObjectId(fixtureIds.fileExercise);
  const quizExercise = new mongoose.Types.ObjectId(fixtureIds.quizExercise);
  const answerPdf = new mongoose.Types.ObjectId(fixtureIds.answerPdf);
  const courseB = new mongoose.Types.ObjectId(fixtureIds.courseB);
  const courseC = new mongoose.Types.ObjectId(fixtureIds.courseC);

  await User.create([
    {
      _id: student,
      fullName: "Học viên BE-04 kiểm thử",
      email: "student.be04@example.test",
      passwordHash,
      role: "STUDENT",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
    {
      _id: admin,
      fullName: "Quản trị BE-04 kiểm thử",
      email: "admin.be04@example.test",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
    {
      _id: new mongoose.Types.ObjectId(fixtureIds.studentB),
      fullName: "Học viên BE-05 thứ hai",
      email: "student-b.be05@example.test",
      passwordHash,
      role: "STUDENT",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
    ...(
      [
        [
          fixtureIds.renewalActive,
          "renewal-active.be05@example.test",
          "Học viên gia hạn còn hạn",
        ],
        [
          fixtureIds.renewalExpired,
          "renewal-expired.be05@example.test",
          "Học viên gia hạn hết hạn",
        ],
        [
          fixtureIds.renewalRevoked,
          "renewal-revoked.be05@example.test",
          "Học viên gia hạn bị thu hồi",
        ],
      ] as const
    ).map(([id, email, fullName]) => ({
      _id: new mongoose.Types.ObjectId(id),
      fullName,
      email,
      passwordHash,
      role: "STUDENT" as const,
      status: "ACTIVE" as const,
      emailVerifiedAt: new Date(),
    })),
  ]);

  await Course.create({
    _id: course,
    code: "BE04-E2E-A1",
    slug: "be04-e2e-a1",
    title: "Khóa học E2E tiếng Đức A1",
    description:
      "Khóa học dữ liệu tổng hợp, chỉ tồn tại trong MongoDB memory replica set.",
    shortDescription: "Nội dung kiểm thử local BE-04.",
    objectives: ["Đọc bài học và hoàn thành bài tập."],
    requirements: [],
    level: "A1",
    thumbnailAssetId: null,
    bannerAssetId: null,
    introVideoAssetId: null,
    price: mongoose.Types.Decimal128.fromString("1950000"),
    accessDurationMonths: 12,
    status: "PUBLISHED",
    sortOrder: 1,
    deletedAt: null,
  });

  await Course.create([
    {
      _id: courseB,
      code: "BE05-E2E-A12",
      slug: "be05-e2e-a12",
      title: "Khóa học E2E tiếng Đức A1.2",
      description:
        "Course B chỉ chứa dữ liệu tổng hợp trong MongoDB memory replica set.",
      shortDescription: "Synthetic course B cho kiểm thử báo giá.",
      objectives: ["Luyện giao tiếp tiếng Đức."],
      requirements: [],
      level: "A1",
      thumbnailAssetId: null,
      bannerAssetId: null,
      introVideoAssetId: null,
      price: mongoose.Types.Decimal128.fromString("2000000"),
      accessDurationMonths: 12,
      status: "PUBLISHED",
      sortOrder: 2,
      deletedAt: null,
    },
    {
      _id: courseC,
      code: "BE05-E2E-A2",
      slug: "be05-e2e-a2",
      title: "Khóa học E2E tiếng Đức A2",
      description:
        "Course C chỉ chứa dữ liệu tổng hợp trong MongoDB memory replica set.",
      shortDescription: "Synthetic course C cho kiểm thử đơn PENDING.",
      objectives: ["Luyện tiếng Đức trình độ A2."],
      requirements: [],
      level: "A2",
      thumbnailAssetId: null,
      bannerAssetId: null,
      introVideoAssetId: null,
      price: mongoose.Types.Decimal128.fromString("2500000"),
      accessDurationMonths: 12,
      status: "PUBLISHED",
      sortOrder: 3,
      deletedAt: null,
    },
  ]);

  await CourseSection.create({
    _id: section,
    courseId: course,
    title: "Chào hỏi · dữ liệu kiểm thử",
    description: "Chương tổng hợp để kiểm chứng quyền truy cập.",
    sectionType: "CHAPTER",
    sortOrder: 1,
    status: "PUBLISHED",
    deletedAt: null,
  });

  await Lesson.create({
    _id: lesson,
    sectionId: section,
    title: "Guten Tag · bài học E2E",
    description: "Bài học giả lập trong môi trường kiểm thử cô lập.",
    content: {
      version: 1,
      paragraphs: ["Guten Tag!", "Wie heißt du? Ich heiße Alex."],
    },
    lessonType: "LECTURE",
    estimatedMinutes: 5,
    countsTowardProgress: true,
    sortOrder: 1,
    status: "PUBLISHED",
    deletedAt: null,
  });

  await Exercise.create([
    {
      _id: fileExercise,
      lessonId: lesson,
      title: "Tài liệu bài tập E2E",
      description: "Bài tập tệp tổng hợp để kiểm tra trạng thái media.",
      instructions: "Mở câu hỏi và xem trạng thái tệp lời giải.",
      exerciseType: "FILE_BASED",
      completionMode: "MANUAL",
      isRequired: true,
      sortOrder: 1,
      status: "PUBLISHED",
      deletedAt: null,
    },
    {
      _id: quizExercise,
      lessonId: lesson,
      title: "Quiz E2E · lời chào",
      description:
        "Một câu hỏi tổng hợp; điểm không quyết định hoàn thành Exercise.",
      instructions: "Chọn một đáp án rồi nộp.",
      exerciseType: "QUIZ",
      completionMode: "QUIZ_SUBMISSION",
      isRequired: true,
      sortOrder: 2,
      status: "PUBLISHED",
      deletedAt: null,
    },
  ]);

  await Quiz.create({
    exerciseId: quizExercise,
    title: "Begrüßungen · Quiz E2E",
    description: "Câu hỏi tổng hợp.",
    passScorePercent: 80,
    showCorrectAnswers: true,
    questions: [
      {
        questionText: "Chọn cách nói “Tạm biệt”.",
        questionType: "SINGLE_CHOICE",
        explanation: "“Auf Wiedersehen” là lời tạm biệt.",
        points: mongoose.Types.Decimal128.fromString("1"),
        sortOrder: 1,
        options: [
          { optionText: "Guten Tag", isCorrect: false, sortOrder: 1 },
          { optionText: "Auf Wiedersehen", isCorrect: true, sortOrder: 2 },
        ],
      },
    ],
  });

  await MediaAsset.create({
    _id: answerPdf,
    originalName: "answer-e2e.pdf",
    mediaType: "PDF",
    mimeType: "application/pdf",
    fileSize: 512,
    provider: "be04-memory-fixture",
    storageKey: "isolated/test/answer.pdf",
    externalMediaId: null,
    durationSeconds: null,
    uploadedById: admin,
    visibility: "ENROLLED",
    uploadStatus: "READY",
    uploadExpiresAt: null,
    deletedAt: null,
    referenceRevision: 0,
  });
  await ExerciseAsset.create({
    exerciseId: fileExercise,
    assetId: answerPdf,
    assetRole: "ANSWER_PDF",
    title: "Đáp án PDF (fixture E2E)",
    sortOrder: 1,
  });

  await RenewalPlan.create({
    courseId: course,
    title: "Gia hạn 3 tháng · E2E",
    durationMonths: 3,
    price: mongoose.Types.Decimal128.fromString("450000"),
    status: "ACTIVE",
    sortOrder: 1,
  });
  await Coupon.create({
    code: "BE04E2E10",
    discountType: "PERCENT",
    discountValue: mongoose.Types.Decimal128.fromString("10"),
    maxDiscount: null,
    usageLimit: 20,
    startsAt: null,
    expiresAt: null,
    status: "ACTIVE",
    reservedCount: 0,
    redemptionCount: 0,
  });
  await Coupon.create(
    Array.from({ length: 21 }, (_, index) => ({
      code: `BE05PAGE${String(index + 1).padStart(2, "0")}`,
      discountType: "PERCENT" as const,
      discountValue: mongoose.Types.Decimal128.fromString("1"),
      maxDiscount: null,
      usageLimit: 100,
      startsAt: null,
      expiresAt: null,
      status: "ACTIVE" as const,
      reservedCount: 0,
      redemptionCount: 0,
    })),
  );
  const coupons = [
    {
      code: "BE05FIXED",
      discountType: "FIXED" as const,
      value: "150000",
      usageLimit: 20,
      status: "ACTIVE" as const,
      expiresAt: null,
    },
    {
      code: "BE05TIE",
      discountType: "FIXED" as const,
      value: "100000",
      usageLimit: 20,
      status: "ACTIVE" as const,
      expiresAt: null,
    },
    {
      code: "BE05LOW",
      discountType: "PERCENT" as const,
      value: "2",
      usageLimit: 20,
      status: "ACTIVE" as const,
      expiresAt: null,
    },
    {
      code: "BE05ONE",
      discountType: "PERCENT" as const,
      value: "10",
      usageLimit: 1,
      status: "ACTIVE" as const,
      expiresAt: null,
    },
    {
      code: "BE05EXPIRED",
      discountType: "PERCENT" as const,
      value: "20",
      usageLimit: 20,
      status: "ACTIVE" as const,
      expiresAt: new Date(Date.now() - 86_400_000),
    },
    {
      code: "BE05OFF",
      discountType: "PERCENT" as const,
      value: "20",
      usageLimit: 20,
      status: "INACTIVE" as const,
      expiresAt: null,
    },
  ];
  await Coupon.create(
    coupons.map((coupon) => ({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: mongoose.Types.Decimal128.fromString(coupon.value),
      maxDiscount: null,
      usageLimit: coupon.usageLimit,
      startsAt: null,
      expiresAt: coupon.expiresAt,
      status: coupon.status,
      reservedCount: 0,
      redemptionCount: 0,
    })),
  );

  const courseObjectId = new mongoose.Types.ObjectId(fixtureIds.course);
  const now = new Date();
  const monthAhead = new Date(now);
  monthAhead.setUTCFullYear(monthAhead.getUTCFullYear() + 1);
  const monthAgo = new Date(now);
  monthAgo.setUTCFullYear(monthAgo.getUTCFullYear() - 1);
  await Enrollment.create([
    {
      userId: new mongoose.Types.ObjectId(fixtureIds.studentB),
      courseId: courseObjectId,
      sourceOrderId: null,
      activatedAt: now,
      expiresAt: monthAhead,
      status: "ACTIVE",
    },
    {
      userId: new mongoose.Types.ObjectId(fixtureIds.renewalActive),
      courseId: courseObjectId,
      sourceOrderId: null,
      activatedAt: now,
      expiresAt: monthAhead,
      status: "ACTIVE",
    },
    {
      userId: new mongoose.Types.ObjectId(fixtureIds.renewalExpired),
      courseId: courseObjectId,
      sourceOrderId: null,
      activatedAt: monthAgo,
      expiresAt: monthAgo,
      status: "ACTIVE",
    },
    {
      userId: new mongoose.Types.ObjectId(fixtureIds.renewalRevoked),
      courseId: courseObjectId,
      sourceOrderId: null,
      activatedAt: now,
      expiresAt: monthAhead,
      status: "REVOKED",
    },
  ]);
  await SiteSettings.create({
    _id: "site",
    siteName: "PAniverseDeutsch E2E",
    logoAssetId: null,
    heroTitle: "Học tiếng Đức cùng fixture E2E",
    heroDescription: "Dữ liệu chỉ dành cho kiểm thử local.",
    heroAssetId: null,
    contactEmail: "support@example.test",
    contactPhone: null,
    facebookUrl: null,
    zaloUrl: null,
    footerDescription: "Synthetic local test data.",
    payment: {
      enabled: true,
      bankName: "BANK E2E · TEST ONLY",
      accountNumber: "0000000000",
      accountHolderName: "TEST FIXTURE ONLY",
      qrUrl: "https://example.test/be04-static-qr-fixture.png",
      transferInstructions: "Dữ liệu giả lập. Không chuyển tiền thật.",
    },
  });
}

async function main() {
  const replicaSet = await MongoMemoryReplSet.create({
    binary: { version: "8.0.34" },
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  const config = parseEnvironment({
    NODE_ENV: "test",
    PORT: String(apiPort),
    MONGODB_URI: replicaSet.getUri(),
    MONGODB_DB_NAME: "paniverse_be04_e2e_test",
    JWT_ACCESS_SECRET: "be04-isolated-e2e-test-secret-at-least-32-chars",
    JWT_ISSUER: "https://api.test.paniverse.invalid",
    JWT_AUDIENCE: "paniverse-be04-e2e-client",
    ACCESS_TOKEN_TTL_SECONDS: "900",
    SESSION_TTL_DAYS: "30",
    APP_ORIGINS: webOrigin,
    COOKIE_SECURE: "false",
    COOKIE_SAME_SITE: "lax",
  });

  await connectMongo(config);
  await ensureIndexes();
  await seedFixtures();
  const app = createApp(config, {
    emailService: new FakeEmailService(),
    readiness: () => true,
  });
  const server = await new Promise<import("node:http").Server>(
    (resolve, reject) => {
      const listener = app.listen(apiPort, "127.0.0.1", () =>
        resolve(listener),
      );
      listener.once("error", reject);
    },
  );
  const controlServer = createServer((request, response) => {
    if (
      request.method !== "POST" ||
      request.url !== "/reset" ||
      request.headers.origin !== webOrigin ||
      request.headers["x-be05-control"] !== controlToken
    ) {
      response.writeHead(404).end();
      return;
    }
    void (async () => {
      try {
        await mongoose.connection.dropDatabase();
        await ensureIndexes();
        await seedFixtures();
        response.writeHead(204).end();
      } catch (error) {
        const message =
          error instanceof Error
            ? `${error.name}: ${error.message.slice(0, 200)}`
            : "Unknown reset error";
        process.stderr.write(`Isolated fixture reset failed (${message}).\n`);
        response.writeHead(500).end();
      }
    })();
  });
  await new Promise<void>((resolve, reject) => {
    controlServer.once("error", reject);
    controlServer.listen(controlPort, "127.0.0.1", resolve);
  });
  process.stdout.write(
    `BE-04 isolated API listening at http://127.0.0.1:${apiPort}; MongoDB is an in-memory replica set.\n`,
  );
  process.stdout.write(
    "Synthetic BE-04/BE-05 test accounts are seeded; the password is defined only in the isolated Playwright fixtures.\n",
  );

  let stopping = false;
  async function stop() {
    if (stopping) return;
    stopping = true;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await new Promise<void>((resolve) => controlServer.close(() => resolve()));
    await disconnectMongo().catch(() => undefined);
    await replicaSet.stop();
  }
  process.once("SIGINT", () => void stop().finally(() => process.exit(0)));
  process.once("SIGTERM", () => void stop().finally(() => process.exit(0)));
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `Unable to start isolated BE-04 E2E API: ${error instanceof Error ? error.message : "Unknown error"}\n`,
  );
  process.exitCode = 1;
});
