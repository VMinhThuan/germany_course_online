import { randomBytes, randomUUID, createHash } from "node:crypto";
import mongoose from "mongoose";
import argon2 from "argon2";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/application.js";
import type { AppConfig } from "../../src/config/env.js";
import {
  AuditLog,
  Course,
  CourseSection,
  Enrollment,
  EnrollmentAdjustment,
  Exercise,
  ExerciseAsset,
  Lesson,
  LessonProgress,
  MediaAsset,
  Quiz,
  QuizAttempt,
  User,
  UserSession,
} from "../../src/db/models/index.js";
import { createLogger } from "../../src/http/logger.js";
import { FakeEmailService } from "../../src/modules/auth/email-service.js";
import { issueAccessToken } from "../../src/modules/auth/jwt.js";
import type { MediaStorageAdapter } from "../../src/modules/learning/media-storage.js";
import {
  clearTestDatabase,
  startTestDatabase,
  stopTestDatabase,
} from "../support/test-database.js";

type Actor = {
  id: string;
  email: string;
  role: "ADMIN" | "STUDENT";
  authorization: string;
  password: string;
};

class FakeMediaStorage implements MediaStorageAdapter {
  readonly uploads = new Map<
    string,
    { contentLength: number; contentType: string }
  >();
  readonly deleted: string[] = [];

  async signRead() {
    return {
      url: "https://storage.example.test/read",
      expiresAt: new Date(Date.now() + 60_000),
    };
  }

  async createUpload(input: {
    storageKey: string;
    mimeType: string;
    fileSize: number;
    expiresInSeconds: number;
  }) {
    this.uploads.set(input.storageKey, {
      contentLength: input.fileSize,
      contentType: input.mimeType,
    });
    return {
      provider: "S3_COMPATIBLE" as const,
      method: "PUT" as const,
      url: `https://storage.example.test/upload/${encodeURIComponent(input.storageKey)}`,
      headers: { "Content-Type": input.mimeType },
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000),
    };
  }

  async headObject(storageKey: string) {
    return this.uploads.get(storageKey) ?? null;
  }

  async deleteObject(storageKey: string) {
    this.deleted.push(storageKey);
    this.uploads.delete(storageKey);
  }
}

const studentPassword = "StudentPassword123!";
let config: AppConfig;
let app: ReturnType<typeof createApp>;
let storage: FakeMediaStorage;
let admin: Actor;
let student: Actor;
let secondStudent: Actor;

async function createActor(
  email: string,
  role: "ADMIN" | "STUDENT" = "STUDENT",
  password = studentPassword,
): Promise<Actor> {
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    timeCost: 2,
    memoryCost: 19_456,
    parallelism: 1,
  });
  const user = await User.create({
    fullName:
      role === "ADMIN"
        ? "Test Admin"
        : email.startsWith("second-")
          ? "Second Test Student"
          : "Test Student",
    email,
    passwordHash,
    role,
    status: "ACTIVE",
  });
  const session = await UserSession.create({
    userId: user._id,
    refreshTokenHash: createHash("sha256")
      .update(randomBytes(32))
      .digest("hex"),
    status: "ACTIVE",
    expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
    roleAtIssue: role,
    deviceName: "Integration test browser",
  });
  const token = await issueAccessToken(config, {
    sub: user._id.toString(),
    sid: session._id.toString(),
    role,
  });
  return {
    id: user._id.toString(),
    email,
    role,
    password,
    authorization: `Bearer ${token}`,
  };
}

function as(
  actor: Actor,
  method: "get" | "post" | "put" | "patch" | "delete",
  path: string,
) {
  return request(app)[method](path).set("Authorization", actor.authorization);
}

function courseInput(overrides: Record<string, unknown> = {}) {
  const suffix = randomUUID().slice(0, 8);
  return {
    code: `A1-${suffix}`,
    slug: `german-a1-${suffix}`,
    title: "German A1 Foundations",
    description: "A beginner course.",
    shortDescription: "Start learning German.",
    objectives: ["Introduce yourself"],
    requirements: [],
    level: "A1",
    price: "1950000",
    accessDurationMonths: 12,
    sortOrder: 1,
    ...overrides,
  };
}

async function makeCourse(
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED" = "DRAFT",
) {
  return Course.create({
    ...courseInput(),
    thumbnailAssetId: null,
    bannerAssetId: null,
    introVideoAssetId: null,
    price: mongoose.Types.Decimal128.fromString("1950000"),
    status,
    deletedAt: null,
  });
}

async function makeSection(
  courseId: mongoose.Types.ObjectId,
  status: "DRAFT" | "PUBLISHED" | "HIDDEN" = "DRAFT",
) {
  return CourseSection.create({
    courseId,
    title: "Chapter 1",
    description: "Introductions",
    sectionType: "CHAPTER",
    sortOrder: 1,
    status,
    deletedAt: null,
  });
}

async function makeLesson(
  sectionId: mongoose.Types.ObjectId,
  status: "DRAFT" | "PUBLISHED" | "HIDDEN" = "DRAFT",
) {
  return Lesson.create({
    sectionId,
    title: "Hallo",
    description: "First words",
    content: { version: 1, paragraphs: ["Hallo!"] },
    lessonType: "LECTURE",
    estimatedMinutes: 5,
    countsTowardProgress: true,
    sortOrder: 1,
    status,
    deletedAt: null,
  });
}

describe("BE-03B Admin CMS, media, account security, enrollment and audit APIs", () => {
  beforeAll(async () => {
    config = await startTestDatabase();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    storage = new FakeMediaStorage();
    app = createApp(config, {
      logger: createLogger("test"),
      emailService: new FakeEmailService(),
      mediaStorage: storage,
    });
    admin = await createActor("admin@example.test", "ADMIN");
    student = await createActor("student@example.test");
    secondStudent = await createActor("learner-two@example.test");
  });

  it("denies CMS actions to guests and Students and creates only a DRAFT course for Admin", async () => {
    const input = courseInput();
    expect(
      (await request(app).post("/api/v1/admin/courses").send(input)).status,
    ).toBe(401);
    expect(
      (await as(student, "post", "/api/v1/admin/courses").send(input)).status,
    ).toBe(403);
    const created = await as(admin, "post", "/api/v1/admin/courses").send(
      input,
    );
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      code: input.code.toUpperCase(),
      slug: input.slug,
      price: "1950000",
      status: "DRAFT",
    });
    expect((await Course.findById(created.body.data.id))?.get("status")).toBe(
      "DRAFT",
    );
  });

  it("rejects invalid price and duplicate course code or slug", async () => {
    const invalid = await as(admin, "post", "/api/v1/admin/courses").send(
      courseInput({ price: "1.5" }),
    );
    expect(invalid.status).toBe(400);
    const firstInput = courseInput();
    const first = await as(admin, "post", "/api/v1/admin/courses").send(
      firstInput,
    );
    expect(first.status).toBe(201);
    const duplicateCode = await as(admin, "post", "/api/v1/admin/courses").send(
      courseInput({ code: firstInput.code }),
    );
    expect(duplicateCode.status).toBe(409);
    const duplicateSlug = await as(admin, "post", "/api/v1/admin/courses").send(
      courseInput({ slug: firstInput.slug }),
    );
    expect(duplicateSlug.status).toBe(409);
    const injectedStatus = await as(
      admin,
      "post",
      "/api/v1/admin/courses",
    ).send(courseInput({ status: "PUBLISHED" }));
    expect(injectedStatus.status).toBe(400);
  });

  it("manages and orders the course tree, publishes explicitly, and soft-deletes without cascading", async () => {
    const created = await as(admin, "post", "/api/v1/admin/courses").send(
      courseInput(),
    );
    const courseId = created.body.data.id as string;
    const section = await as(
      admin,
      "post",
      `/api/v1/admin/courses/${courseId}/sections`,
    ).send({
      title: "Chapter 2",
      sectionType: "CHAPTER",
      sortOrder: 2,
      status: "PUBLISHED",
    });
    const firstSection = await as(
      admin,
      "post",
      `/api/v1/admin/courses/${courseId}/sections`,
    ).send({
      title: "Chapter 1",
      sectionType: "CHAPTER",
      sortOrder: 1,
      status: "PUBLISHED",
    });
    expect(section.status).toBe(201);
    const listed = await as(
      admin,
      "get",
      `/api/v1/admin/courses/${courseId}/sections`,
    ).query({ page: 1, pageSize: 20 });
    expect(
      listed.body.data.items.map((item: { title: string }) => item.title),
    ).toEqual(["Chapter 1", "Chapter 2"]);
    const lesson = await as(
      admin,
      "post",
      `/api/v1/admin/sections/${firstSection.body.data.id}/lessons`,
    ).send({
      title: "Hallo",
      description: "Greeting",
      content: { version: 1, paragraphs: ["Hallo!"] },
      video: { provider: "YOUTUBE", videoId: "lamg3tUwct4" },
      solutionVideo: { provider: "YOUTUBE", videoId: "p2qX6g71ZgI" },
      lessonType: "LECTURE",
      estimatedMinutes: 5,
      countsTowardProgress: true,
      sortOrder: 1,
      status: "PUBLISHED",
    });
    expect(lesson.status).toBe(201);
    expect(lesson.body.data.video).toEqual({
      provider: "YOUTUBE",
      videoId: "lamg3tUwct4",
    });
    expect(lesson.body.data.solutionVideo).toEqual({
      provider: "YOUTUBE",
      videoId: "p2qX6g71ZgI",
    });
    const before = await request(app).get(
      `/api/v1/courses/${created.body.data.slug}`,
    );
    expect(before.status).toBe(404);
    const published = await as(
      admin,
      "post",
      `/api/v1/admin/courses/${courseId}/publish`,
    );
    expect(published.body.data.status).toBe("PUBLISHED");
    const publicCourse = await request(app).get(
      `/api/v1/courses/${created.body.data.slug}`,
    );
    expect(publicCourse.status).toBe(200);
    expect(publicCourse.body.data.sections).toHaveLength(2);
    expect(publicCourse.body.data.sections[0].lessons[0]).not.toHaveProperty(
      "content",
    );

    await LessonProgress.create({
      userId: new mongoose.Types.ObjectId(student.id),
      lessonId: new mongoose.Types.ObjectId(lesson.body.data.id),
      status: "IN_PROGRESS",
      startedAt: new Date(),
      completedAt: null,
      lastAccessedAt: new Date(),
    });
    const deleted = await as(
      admin,
      "delete",
      `/api/v1/admin/courses/${courseId}`,
    );
    expect(deleted.body.data.deleted).toBe(true);
    expect(
      await CourseSection.countDocuments({
        courseId: new mongoose.Types.ObjectId(courseId),
      }),
    ).toBe(2);
    expect(await LessonProgress.countDocuments()).toBe(1);
    expect(
      (await request(app).get(`/api/v1/courses/${created.body.data.slug}`))
        .status,
    ).toBe(404);
  });

  it("rejects invalid hierarchy substitutions and unsafe lesson content", async () => {
    const mismatch = await as(
      admin,
      "post",
      `/api/v1/admin/courses/${new mongoose.Types.ObjectId()}/sections`,
    ).send({
      title: "No parent",
      sectionType: "CHAPTER",
      sortOrder: 1,
      status: "DRAFT",
    });
    expect(mismatch.status).toBe(404);
    const course = await makeCourse();
    const section = await makeSection(course._id);
    const unsafe = await as(
      admin,
      "post",
      `/api/v1/admin/sections/${section.id}/lessons`,
    ).send({
      title: "unsafe",
      content: { version: 1, paragraphs: ["<script>alert(1)</script>"] },
      lessonType: "LECTURE",
      countsTowardProgress: true,
      sortOrder: 1,
      status: "DRAFT",
    });
    expect(unsafe.status).toBe(400);
    const large = await as(
      admin,
      "post",
      `/api/v1/admin/sections/${section.id}/lessons`,
    ).send({
      title: "large",
      content: {
        version: 1,
        paragraphs: ["x".repeat(4000), ...Array(20).fill("x".repeat(4000))],
      },
      lessonType: "LECTURE",
      countsTowardProgress: true,
      sortOrder: 1,
      status: "DRAFT",
    });
    expect(large.status).toBe(400);
    const invalidVideo = await as(
      admin,
      "post",
      `/api/v1/admin/sections/${section.id}/lessons`,
    ).send({
      title: "invalid video",
      video: { provider: "YOUTUBE", videoId: "too-short" },
      lessonType: "LECTURE",
      countsTowardProgress: true,
      sortOrder: 2,
      status: "DRAFT",
    });
    expect(invalidVideo.status).toBe(400);
  });

  it("rejects impossible exercise modes and publishes valid required quizzes", async () => {
    const course = await makeCourse();
    const section = await makeSection(course._id);
    const lesson = await makeLesson(section._id);
    const invalid = await as(
      admin,
      "post",
      `/api/v1/admin/lessons/${lesson.id}/exercises`,
    ).send({
      title: "wrong",
      instructions: "Try",
      exerciseType: "FILE_BASED",
      completionMode: "QUIZ_SUBMISSION",
      isRequired: true,
      sortOrder: 1,
      status: "DRAFT",
    });
    expect(invalid.status).toBe(400);
    const exerciseResponse = await as(
      admin,
      "post",
      `/api/v1/admin/lessons/${lesson.id}/exercises`,
    ).send({
      title: "Quiz",
      instructions: "Choose one.",
      exerciseType: "QUIZ",
      completionMode: "QUIZ_SUBMISSION",
      isRequired: true,
      sortOrder: 1,
      status: "DRAFT",
    });
    const exerciseId = exerciseResponse.body.data.id as string;
    const quiz = await as(
      admin,
      "put",
      `/api/v1/admin/exercises/${exerciseId}/quiz`,
    ).send({
      title: "Greeting",
      showCorrectAnswers: true,
      questions: [
        {
          questionText: "How do you say hello?",
          points: "1",
          sortOrder: 1,
          options: [
            { optionText: "Hallo", isCorrect: true, sortOrder: 1 },
            { optionText: "Tschüss", isCorrect: false, sortOrder: 2 },
          ],
        },
      ],
    });
    expect(quiz.status).toBe(200);
    const published = await as(
      admin,
      "patch",
      `/api/v1/admin/exercises/${exerciseId}`,
    ).send({ status: "PUBLISHED" });
    expect(published.status).toBe(200);
    expect(published.body.data.status).toBe("PUBLISHED");
    expect(
      (await as(student, "get", `/api/v1/admin/exercises/${exerciseId}/quiz`))
        .status,
    ).toBe(403);
  });

  it("validates quiz correctness and preserves a submitted attempt grading snapshot across edits", async () => {
    const course = await makeCourse();
    const section = await makeSection(course._id);
    const lesson = await makeLesson(section._id);
    const exercise = await Exercise.create({
      lessonId: lesson._id,
      title: "Quiz",
      description: null,
      instructions: "Pick one.",
      exerciseType: "QUIZ",
      completionMode: "QUIZ_SUBMISSION",
      isRequired: false,
      sortOrder: 1,
      status: "DRAFT",
      deletedAt: null,
    });
    const invalid = await as(
      admin,
      "put",
      `/api/v1/admin/exercises/${exercise.id}/quiz`,
    ).send({
      title: "Broken",
      showCorrectAnswers: true,
      questions: [
        {
          questionText: "Question?",
          points: "0",
          sortOrder: 1,
          options: [
            { optionText: "A", isCorrect: true, sortOrder: 1 },
            { optionText: "B", isCorrect: true, sortOrder: 2 },
          ],
        },
      ],
    });
    expect(invalid.status).toBe(400);
    const saved = await as(
      admin,
      "put",
      `/api/v1/admin/exercises/${exercise.id}/quiz`,
    ).send({
      title: "Quiz",
      showCorrectAnswers: true,
      questions: [
        {
          questionText: "Greeting?",
          points: "1",
          sortOrder: 1,
          options: [
            { optionText: "Hallo", isCorrect: true, sortOrder: 1 },
            { optionText: "Danke", isCorrect: false, sortOrder: 2 },
          ],
        },
      ],
    });
    expect(saved.status).toBe(200);
    const quiz = await Quiz.findOne({ exerciseId: exercise._id });
    const question = quiz!.get("questions")[0]!;
    const option = question.options[0]!;
    const secondOption = question.options[1]!;
    await QuizAttempt.create({
      userId: new mongoose.Types.ObjectId(student.id),
      quizId: quiz!._id,
      exerciseId: exercise._id,
      status: "SUBMITTED",
      score: mongoose.Types.Decimal128.fromString("1"),
      maxScore: mongoose.Types.Decimal128.fromString("1"),
      correctCount: 1,
      totalQuestions: 1,
      gradingSnapshot: {
        title: "Quiz",
        showCorrectAnswers: true,
        passScorePercent: null,
        questions: [
          {
            questionId: question._id,
            prompt: "Greeting?",
            questionType: "SINGLE_CHOICE",
            explanation: null,
            points: mongoose.Types.Decimal128.fromString("1"),
            sortOrder: 1,
            options: question.options.map(
              (item: {
                _id: mongoose.Types.ObjectId;
                optionText: string;
                isCorrect: boolean;
                sortOrder: number;
              }) => ({
                optionId: item._id,
                label: item.optionText,
                isCorrect: item.isCorrect,
                sortOrder: item.sortOrder,
              }),
            ),
          },
        ],
      },
      answers: [
        {
          questionId: question._id,
          selectedOptionId: option._id,
          isCorrect: true,
          awardedPoints: mongoose.Types.Decimal128.fromString("1"),
        },
      ],
      startedAt: new Date(Date.now() - 60_000),
      submittedAt: new Date(),
    });
    const before = (await QuizAttempt.findOne({ quizId: quiz!._id }).lean())!
      .gradingSnapshot;
    const edited = await as(
      admin,
      "put",
      `/api/v1/admin/exercises/${exercise.id}/quiz`,
    ).send({
      title: "Updated quiz",
      showCorrectAnswers: false,
      questions: [
        {
          id: question._id.toString(),
          questionText: "Updated greeting?",
          points: "3",
          sortOrder: 1,
          options: [
            {
              id: option._id.toString(),
              optionText: "Hallo updated",
              isCorrect: true,
              sortOrder: 1,
            },
            {
              id: secondOption._id.toString(),
              optionText: "Danke",
              isCorrect: false,
              sortOrder: 2,
            },
          ],
        },
      ],
    });
    expect(edited.status).toBe(200);
    const after = (await QuizAttempt.findOne({ quizId: quiz!._id }).lean())!
      .gradingSnapshot;
    expect(after).toEqual(before);
    expect(edited.body.data.questions[0].options[0].isCorrect).toBe(true);
  });

  it("rejects unconfigured media operations and validates upload type and size before creating an intent", async () => {
    const noStorageApp = createApp(config, {
      emailService: new FakeEmailService(),
    });
    const unavailable = await request(noStorageApp)
      .post("/api/v1/admin/media-assets/upload-intents")
      .set("Authorization", admin.authorization)
      .send({
        originalName: "x.jpg",
        mediaType: "IMAGE",
        mimeType: "image/jpeg",
        fileSize: 100,
        visibility: "ENROLLED",
      });
    expect(unavailable.status).toBe(503);
    const invalidType = await as(
      admin,
      "post",
      "/api/v1/admin/media-assets/upload-intents",
    ).send({
      originalName: "x.jpg",
      mediaType: "IMAGE",
      mimeType: "text/html",
      fileSize: 100,
      visibility: "ENROLLED",
    });
    expect(invalidType.status).toBe(400);
    const invalidSize = await as(
      admin,
      "post",
      "/api/v1/admin/media-assets/upload-intents",
    ).send({
      originalName: "x.jpg",
      mediaType: "IMAGE",
      mimeType: "image/jpeg",
      fileSize: 20 * 1024 * 1024 + 1,
      visibility: "ENROLLED",
    });
    expect(invalidSize.status).toBe(400);
    const invalidFolder = await as(
      admin,
      "post",
      "/api/v1/admin/media-assets/upload-intents",
    ).send({
      originalName: "x.pdf",
      mediaType: "PDF",
      mimeType: "application/pdf",
      fileSize: 100,
      visibility: "ENROLLED",
      assetFolder: "lesson-pdf/../outside",
    });
    expect(invalidFolder.status).toBe(400);
    expect(await MediaAsset.countDocuments()).toBe(0);
  });

  it("finalizes upload only after provider metadata verification, lists safe metadata, and blocks referenced deletion", async () => {
    const intent = await as(
      admin,
      "post",
      "/api/v1/admin/media-assets/upload-intents",
    ).send({
      originalName: "private\\folder\\worksheet.pdf",
      mediaType: "PDF",
      mimeType: "application/pdf",
      fileSize: 2048,
      visibility: "ENROLLED",
    });
    expect(intent.status).toBe(201);
    expect(intent.body.data.uploadUrl).toMatch(
      /^https:\/\/storage\.example\.test/,
    );
    expect(JSON.stringify(intent.body)).not.toMatch(
      /storageKey|accessKey|secret/i,
    );
    const assetId = intent.body.data.assetId as string;
    const pending = await as(admin, "get", "/api/v1/admin/media-assets").query({
      page: 1,
      pageSize: 20,
    });
    expect(pending.body.data.items).toHaveLength(0);
    const complete = await as(
      admin,
      "post",
      `/api/v1/admin/media-assets/${assetId}/complete-upload`,
    ).send({});
    expect(complete.status).toBe(200);
    expect(complete.body.data.originalName).toBe("worksheet.pdf");
    expect(complete.body.data).not.toHaveProperty("storageKey");
    const listed = await as(admin, "get", "/api/v1/admin/media-assets").query({
      page: 1,
      pageSize: 20,
      q: "worksheet",
    });
    expect(listed.body.data.items).toHaveLength(1);

    const course = await makeCourse();
    const section = await makeSection(course._id);
    const lesson = await makeLesson(section._id);
    const file = await as(
      admin,
      "put",
      `/api/v1/admin/lessons/${lesson.id}/assets/${assetId}`,
    ).send({ assetRole: "ATTACHMENT", title: "Worksheet", sortOrder: 1 });
    expect(file.status).toBe(200);
    expect(file.body.data).toMatchObject({
      assetId,
      assetRole: "ATTACHMENT",
      title: "Worksheet",
      sortOrder: 1,
    });
    const updatedLink = await as(
      admin,
      "put",
      `/api/v1/admin/lessons/${lesson.id}/assets/${assetId}`,
    ).send({
      assetRole: "ATTACHMENT",
      title: "Updated worksheet",
      sortOrder: 2,
    });
    expect(updatedLink.status).toBe(200);
    expect(updatedLink.body.data).toMatchObject({
      assetId,
      assetRole: "ATTACHMENT",
      title: "Updated worksheet",
      sortOrder: 2,
    });
    const blockedDelete = await as(
      admin,
      "delete",
      `/api/v1/admin/media-assets/${assetId}`,
    );
    expect(blockedDelete.status).toBe(409);
    const detached = await as(
      admin,
      "delete",
      `/api/v1/admin/lessons/${lesson.id}/assets/${assetId}`,
    ).query({ assetRole: "ATTACHMENT" });
    expect(detached.body.data.detached).toBe(true);
    const deleted = await as(
      admin,
      "delete",
      `/api/v1/admin/media-assets/${assetId}`,
    );
    expect(deleted.body.data.deleted).toBe(true);
    expect(storage.deleted).toHaveLength(1);
  });

  it("detaches only the requested role when one PDF is associated more than once", async () => {
    const upload = await as(
      admin,
      "post",
      "/api/v1/admin/media-assets/upload-intents",
    ).send({
      originalName: "answers.pdf",
      mediaType: "PDF",
      mimeType: "application/pdf",
      fileSize: 1000,
      visibility: "ENROLLED",
    });
    const assetId = upload.body.data.assetId as string;
    await as(
      admin,
      "post",
      `/api/v1/admin/media-assets/${assetId}/complete-upload`,
    ).send({});
    const course = await makeCourse();
    const section = await makeSection(course._id);
    const lesson = await makeLesson(section._id);
    const exercise = await Exercise.create({
      lessonId: lesson._id,
      title: "Files",
      description: null,
      instructions: "Read",
      exerciseType: "FILE_BASED",
      completionMode: "MANUAL",
      isRequired: false,
      sortOrder: 1,
      status: "DRAFT",
      deletedAt: null,
    });
    for (const [assetRole, sortOrder] of [
      ["QUESTION_PDF", 1],
      ["ANSWER_PDF", 2],
    ] as const) {
      expect(
        (
          await as(
            admin,
            "put",
            `/api/v1/admin/exercises/${exercise.id}/assets/${assetId}`,
          ).send({ assetRole, title: assetRole, sortOrder })
        ).status,
      ).toBe(200);
    }
    await as(
      admin,
      "delete",
      `/api/v1/admin/exercises/${exercise.id}/assets/${assetId}`,
    ).query({ assetRole: "QUESTION_PDF" });
    const remaining = await ExerciseAsset.find({
      exerciseId: exercise._id,
    }).lean();
    expect(remaining.map((item) => item.assetRole)).toEqual(["ANSWER_PDF"]);
    expect(
      (await as(admin, "delete", `/api/v1/admin/media-assets/${assetId}`))
        .status,
    ).toBe(409);
    await as(
      admin,
      "delete",
      `/api/v1/admin/exercises/${exercise.id}/assets/${assetId}`,
    ).query({ assetRole: "ANSWER_PDF" });
    expect(
      (await as(admin, "delete", `/api/v1/admin/media-assets/${assetId}`))
        .status,
    ).toBe(200);
  });

  it("accepts only ready image assets for site settings and protects the reference from deletion", async () => {
    const imageIntent = await as(
      admin,
      "post",
      "/api/v1/admin/media-assets/upload-intents",
    ).send({
      originalName: "logo.png",
      mediaType: "IMAGE",
      mimeType: "image/png",
      fileSize: 512,
      visibility: "PUBLIC",
    });
    const imageId = imageIntent.body.data.assetId as string;
    expect(
      (
        await as(
          admin,
          "post",
          `/api/v1/admin/media-assets/${imageId}/complete-upload`,
        ).send({})
      ).status,
    ).toBe(200);
    expect(
      (
        await as(admin, "patch", "/api/v1/admin/site-settings").send({
          logoAssetId: imageId,
        })
      ).status,
    ).toBe(200);
    expect(
      (await as(admin, "delete", `/api/v1/admin/media-assets/${imageId}`))
        .status,
    ).toBe(409);

    const pdfIntent = await as(
      admin,
      "post",
      "/api/v1/admin/media-assets/upload-intents",
    ).send({
      originalName: "not-an-image.pdf",
      mediaType: "PDF",
      mimeType: "application/pdf",
      fileSize: 512,
      visibility: "PUBLIC",
    });
    const pdfId = pdfIntent.body.data.assetId as string;
    expect(
      (
        await as(
          admin,
          "post",
          `/api/v1/admin/media-assets/${pdfId}/complete-upload`,
        ).send({})
      ).status,
    ).toBe(200);
    const invalidReference = await as(
      admin,
      "patch",
      "/api/v1/admin/site-settings",
    ).send({ heroAssetId: pdfId });
    expect(invalidReference.status).toBe(422);
  });

  it("updates only allowed Student profile fields and safely revokes owned sessions", async () => {
    const ownProfile = await as(student, "get", "/api/v1/me/profile");
    expect(ownProfile.body.data.email).toBe(student.email);
    const avatarIntent = await as(
      admin,
      "post",
      "/api/v1/admin/media-assets/upload-intents",
    ).send({
      originalName: "avatar.png",
      mediaType: "IMAGE",
      mimeType: "image/png",
      fileSize: 512,
      visibility: "PUBLIC",
    });
    const avatarAssetId = avatarIntent.body.data.assetId as string;
    expect(
      (
        await as(
          admin,
          "post",
          `/api/v1/admin/media-assets/${avatarAssetId}/complete-upload`,
        ).send({})
      ).status,
    ).toBe(200);
    const updated = await as(student, "patch", "/api/v1/me/profile").send({
      fullName: "Updated Student",
      phone: "+84900000000",
      avatarAssetId,
    });
    expect(updated.body.data.fullName).toBe("Updated Student");
    expect(updated.body.data.avatarUrl).toBe(
      "https://storage.example.test/read",
    );
    expect(
      (await as(student, "patch", "/api/v1/me/profile").send({ role: "ADMIN" }))
        .status,
    ).toBe(400);
    const privateAvatarIntent = await as(
      admin,
      "post",
      "/api/v1/admin/media-assets/upload-intents",
    ).send({
      originalName: "private-avatar.png",
      mediaType: "IMAGE",
      mimeType: "image/png",
      fileSize: 512,
      visibility: "ENROLLED",
    });
    const privateAvatarId = privateAvatarIntent.body.data.assetId as string;
    expect(
      (
        await as(
          admin,
          "post",
          `/api/v1/admin/media-assets/${privateAvatarId}/complete-upload`,
        ).send({})
      ).status,
    ).toBe(200);
    expect(
      (
        await as(student, "patch", "/api/v1/me/profile").send({
          avatarAssetId: privateAvatarId,
        })
      ).status,
    ).toBe(422);
    const sessions = await as(student, "get", "/api/v1/me/sessions");
    expect(sessions.body.data.items[0]).toMatchObject({
      isCurrent: true,
      deviceName: "Integration test browser",
    });
    expect(JSON.stringify(sessions.body)).not.toMatch(
      /refreshTokenHash|refreshToken|ipAddress|userAgent/i,
    );
    const ownSessionId = sessions.body.data.items[0].id as string;
    const otherSessions = await UserSession.find({
      userId: new mongoose.Types.ObjectId(secondStudent.id),
    });
    expect(
      (
        await as(
          student,
          "delete",
          `/api/v1/me/sessions/${otherSessions[0]!._id}`,
        )
      ).status,
    ).toBe(404);
    const revoked = await as(
      student,
      "delete",
      `/api/v1/me/sessions/${ownSessionId}`,
    );
    expect(revoked.status).toBe(200);
    expect((await UserSession.findById(ownSessionId))?.get("status")).toBe(
      "REVOKED",
    );
    expect((await as(student, "get", "/api/v1/me/profile")).status).toBe(401);
  });

  it("verifies the current password and revokes every session after a password change", async () => {
    const wrong = await as(student, "put", "/api/v1/me/password").send({
      currentPassword: "wrong password",
      newPassword: "NewStudentPassword123!",
    });
    expect(wrong.status).toBe(400);
    const changed = await as(student, "put", "/api/v1/me/password").send({
      currentPassword: student.password,
      newPassword: "NewStudentPassword123!",
    });
    expect(changed.status).toBe(200);
    expect(
      await UserSession.countDocuments({
        userId: new mongoose.Types.ObjectId(student.id),
        status: "ACTIVE",
      }),
    ).toBe(0);
    const user = await User.findById(student.id).select("+passwordHash");
    expect(
      await argon2.verify(
        user!.get("passwordHash") as string,
        "NewStudentPassword123!",
      ),
    ).toBe(true);
    expect((await as(student, "get", "/api/v1/me/profile")).status).toBe(401);
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: student.email, password: "NewStudentPassword123!" });
    expect(login.status).toBe(200);
  });

  it("searches safe Student records and blocking revokes their active sessions", async () => {
    const listed = await as(admin, "get", "/api/v1/admin/students").query({
      page: 1,
      pageSize: 20,
      q: student.email,
    });
    expect(listed.status).toBe(200);
    expect(listed.body.data.items).toHaveLength(1);
    expect(listed.body.data.items[0]).not.toHaveProperty("passwordHash");
    const detail = await as(
      admin,
      "get",
      `/api/v1/admin/students/${student.id}`,
    );
    expect(detail.body.data).toHaveProperty("enrollments");
    expect(detail.body.data).toHaveProperty("orders");
    const blocked = await as(
      admin,
      "patch",
      `/api/v1/admin/students/${student.id}/status`,
    ).send({ status: "BLOCKED" });
    expect(blocked.body.data.user.status).toBe("BLOCKED");
    expect(
      await UserSession.countDocuments({
        userId: new mongoose.Types.ObjectId(student.id),
        status: "ACTIVE",
      }),
    ).toBe(0);
    expect((await as(student, "get", "/api/v1/me/profile")).status).toBe(401);
    expect(
      (
        await as(
          student,
          "patch",
          `/api/v1/admin/students/${student.id}/status`,
        ).send({ status: "ACTIVE" })
      ).status,
    ).toBe(401);
  });

  it("provides bounded enrollment history and redacted audit pages", async () => {
    const course = await makeCourse("PUBLISHED");
    const enrollment = await Enrollment.create({
      userId: new mongoose.Types.ObjectId(student.id),
      courseId: course._id,
      sourceOrderId: null,
      activatedAt: new Date(Date.now() - 86_400_000),
      expiresAt: new Date(Date.now() + 30 * 86_400_000),
      status: "ACTIVE",
    });
    const expiredCourse = await makeCourse("PUBLISHED");
    await Enrollment.create({
      userId: new mongoose.Types.ObjectId(student.id),
      courseId: expiredCourse._id,
      sourceOrderId: null,
      activatedAt: new Date(Date.now() - 60 * 86_400_000),
      expiresAt: new Date(Date.now() - 1),
      status: "ACTIVE",
    });
    await EnrollmentAdjustment.create({
      enrollmentId: enrollment._id,
      adjustmentType: "GRANT",
      previousExpiresAt: null,
      newExpiresAt: enrollment.expiresAt,
      durationMonths: 12,
      orderId: null,
      performedById: new mongoose.Types.ObjectId(admin.id),
      reason: "Approved order",
    });
    await AuditLog.create({
      actorUserId: new mongoose.Types.ObjectId(admin.id),
      action: "SAFE_TEST_EVENT",
      entityType: "ENROLLMENT",
      entityId: enrollment._id,
      oldValue: { passwordHash: "never-return" },
      newValue: { changedFields: ["status"], refreshToken: "never-return" },
      ipAddress: "192.0.2.10",
    });
    const list = await as(admin, "get", "/api/v1/admin/enrollments").query({
      page: 1,
      pageSize: 20,
      userId: student.id,
    });
    expect(list.status).toBe(200);
    expect(list.body.data.items[0].student.email).toBe(student.email);
    expect(list.body.data.items[0].course.title).toBe(course.title);
    expect(
      (
        await as(admin, "get", "/api/v1/admin/enrollments").query({
          page: 1,
          pageSize: 20,
          userId: student.id,
          status: "ACTIVE",
        })
      ).body.data.items,
    ).toHaveLength(1);
    expect(
      (
        await as(admin, "get", "/api/v1/admin/enrollments").query({
          page: 1,
          pageSize: 20,
          userId: student.id,
          status: "EXPIRED",
        })
      ).body.data.items,
    ).toHaveLength(1);
    const detail = await as(
      admin,
      "get",
      `/api/v1/admin/enrollments/${enrollment.id}`,
    );
    expect(detail.body.data.adjustments).toHaveLength(1);
    expect((await as(student, "get", "/api/v1/admin/enrollments")).status).toBe(
      403,
    );
    expect(
      (
        await as(
          admin,
          "post",
          `/api/v1/admin/enrollments/${enrollment.id}/revoke`,
        ).send({})
      ).status,
    ).toBe(400);
    const logs = await as(admin, "get", "/api/v1/admin/audit-logs").query({
      page: 1,
      pageSize: 20,
      entityType: "ENROLLMENT",
      actorUserId: admin.id,
    });
    expect(logs.status).toBe(200);
    expect(logs.body.data.items[0].changedFields).toEqual(["status"]);
    expect(JSON.stringify(logs.body)).not.toMatch(
      /never-return|passwordHash|refreshToken|192\.0\.2\.10|oldValue|newValue|ipAddress/i,
    );
  });
});
