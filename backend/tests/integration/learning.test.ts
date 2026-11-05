import { createHash, randomUUID } from "node:crypto";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/application.js";
import type { AppConfig } from "../../src/config/env.js";
import {
  Course,
  CourseSection,
  Enrollment,
  Exercise,
  ExerciseAsset,
  ExerciseProgress,
  Lesson,
  LessonAsset,
  LessonNote,
  LessonProgress,
  MediaAsset,
  Quiz,
  QuizAttempt,
  User,
  UserSession,
} from "../../src/db/models/index.js";
import { createLogger } from "../../src/http/logger.js";
import { issueAccessToken } from "../../src/modules/auth/jwt.js";
import type {
  MediaStorageAdapter,
  SignMediaInput,
  SignedMediaUrl,
} from "../../src/modules/learning/media-storage.js";
import {
  clearTestDatabase,
  startTestDatabase,
  stopTestDatabase,
} from "../support/test-database.js";

type Actor = { userId: string; authorization: string };

class FakeMediaStorage implements MediaStorageAdapter {
  readonly signedInputs: SignMediaInput[] = [];

  async signRead(input: SignMediaInput): Promise<SignedMediaUrl> {
    this.signedInputs.push(input);
    return {
      url: `https://media.example.test/signed/${this.signedInputs.length}`,
      expiresAt: new Date(Date.now() + 5 * 60_000),
    };
  }
}

let config: AppConfig;
let app: ReturnType<typeof createApp>;
let storage: FakeMediaStorage;
let student: Actor;
let secondStudent: Actor;
let courseId: string;
let sectionId: string;
let lessonId: string;
let manualExerciseId: string;
let quizExerciseId: string;
let answerAssetId: string;
let questionAssetId: string;
let quizId: string;
let correctOptionId: string;
let wrongOptionId: string;

async function createActor(
  email: string,
  role: "STUDENT" | "ADMIN" = "STUDENT",
) {
  const user = await User.create({
    fullName: role === "ADMIN" ? "Test Admin" : "Test Student",
    email,
    passwordHash: "test-only-not-used-by-auth-middleware",
    role,
    status: "ACTIVE",
  });
  const session = await UserSession.create({
    userId: user._id,
    refreshTokenHash: createHash("sha256").update(randomUUID()).digest("hex"),
    status: "ACTIVE",
    expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
    roleAtIssue: role,
  });
  const token = await issueAccessToken(config, {
    sub: user._id.toString(),
    sid: session._id.toString(),
    role,
  });
  return { userId: user._id.toString(), authorization: `Bearer ${token}` };
}

async function createPublishedCourse(slug: string) {
  return Course.create({
    code: `A1-${randomUUID().slice(0, 8)}`,
    title: "German A1",
    slug,
    description: "Learn German through guided lessons.",
    shortDescription: "A beginner German course.",
    objectives: ["Introduce yourself"],
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
}

async function createMediaAsset(mediaType: "PDF" | "VIDEO" = "PDF") {
  const id = new mongoose.Types.ObjectId().toString();
  return MediaAsset.create({
    originalName: `${id}.${mediaType.toLowerCase()}`,
    mediaType,
    mimeType: mediaType === "PDF" ? "application/pdf" : "video/mp4",
    fileSize: 2048,
    provider: "S3_COMPATIBLE",
    storageKey: `private/learning/${id}`,
    externalMediaId: null,
    durationSeconds: mediaType === "VIDEO" ? 90 : null,
    uploadedById: null,
    visibility: "ENROLLED",
  });
}

async function enroll(userId: string, targetCourseId: string) {
  const now = new Date();
  return Enrollment.create({
    userId: new mongoose.Types.ObjectId(userId),
    courseId: new mongoose.Types.ObjectId(targetCourseId),
    sourceOrderId: null,
    activatedAt: now,
    expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60_000),
    status: "ACTIVE",
  });
}

async function requestAs(
  actor: Actor,
  method: "get" | "post" | "put",
  path: string,
) {
  return request(app)[method](path).set("Authorization", actor.authorization);
}

describe("BE-02 student learning APIs", () => {
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
      mediaStorage: storage,
      readiness: () => true,
    });
    student = await createActor("student@example.test");
    secondStudent = await createActor("other-student@example.test");

    const course = await createPublishedCourse("german-a1");
    courseId = course._id.toString();
    const section = await CourseSection.create({
      courseId: course._id,
      title: "Chapter 1: First conversations",
      description: "Greetings and introductions.",
      sectionType: "CHAPTER",
      sortOrder: 1,
      status: "PUBLISHED",
      deletedAt: null,
    });
    sectionId = section._id.toString();
    const lesson = await Lesson.create({
      sectionId: section._id,
      title: "Say hello",
      description: "Learn the first greetings.",
      content: {
        blocks: [{ type: "text", text: "Hallo!" }],
        passwordHash: "must-not-leak",
        nested: { storageKey: "must-not-leak-either" },
      },
      video: { provider: "YOUTUBE", videoId: "lamg3tUwct4" },
      solutionVideo: { provider: "YOUTUBE", videoId: "p2qX6g71ZgI" },
      lessonType: "LECTURE",
      estimatedMinutes: 8,
      countsTowardProgress: true,
      sortOrder: 1,
      status: "PUBLISHED",
      deletedAt: null,
    });
    lessonId = lesson._id.toString();

    const manualExercise = await Exercise.create({
      lessonId: lesson._id,
      title: "Greeting practice",
      description: "Read and review the worksheet.",
      instructions: "Complete the worksheet, then mark it complete.",
      exerciseType: "FILE_BASED",
      completionMode: "MANUAL",
      isRequired: true,
      sortOrder: 1,
      status: "PUBLISHED",
      deletedAt: null,
    });
    manualExerciseId = manualExercise._id.toString();
    const answerAsset = await createMediaAsset("PDF");
    answerAssetId = answerAsset._id.toString();
    await ExerciseAsset.create({
      exerciseId: manualExercise._id,
      assetId: answerAsset._id,
      assetRole: "ANSWER_PDF",
      title: "Answer sheet",
      sortOrder: 2,
    });
    const lessonAsset = await createMediaAsset("VIDEO");
    await LessonAsset.create({
      lessonId: lesson._id,
      assetId: lessonAsset._id,
      assetRole: "LECTURE_VIDEO",
      title: "Greeting lesson video",
      sortOrder: 1,
    });

    const quizExercise = await Exercise.create({
      lessonId: lesson._id,
      title: "Greeting quiz",
      description: null,
      instructions: "Choose the German greeting.",
      exerciseType: "QUIZ",
      completionMode: "QUIZ_SUBMISSION",
      isRequired: false,
      sortOrder: 2,
      status: "PUBLISHED",
      deletedAt: null,
    });
    quizExerciseId = quizExercise._id.toString();
    const questionAsset = await createMediaAsset("PDF");
    questionAssetId = questionAsset._id.toString();
    await ExerciseAsset.create({
      exerciseId: quizExercise._id,
      assetId: questionAsset._id,
      assetRole: "QUESTION_PDF",
      title: "Quiz worksheet",
      sortOrder: 1,
    });
    const quiz = await Quiz.create({
      exerciseId: quizExercise._id,
      title: "Greetings",
      description: null,
      passScorePercent: 100,
      showCorrectAnswers: true,
      questions: [
        {
          questionText: "Which word means hello?",
          questionType: "SINGLE_CHOICE",
          explanation: "Hallo is a common German greeting.",
          points: mongoose.Types.Decimal128.fromString("0.125"),
          sortOrder: 1,
          options: [
            { optionText: "Hallo", isCorrect: true, sortOrder: 1 },
            { optionText: "Tschüss", isCorrect: false, sortOrder: 2 },
          ],
        },
      ],
    });
    quizId = quiz._id.toString();
    const question = quiz.questions[0]!;
    correctOptionId = question.options
      .find((option) => option.isCorrect)!
      ._id.toString();
    wrongOptionId = question.options
      .find((option) => !option.isCorrect)!
      ._id.toString();

    await enroll(student.userId, courseId);
  });

  it("serves the enrolled course hierarchy, protects answer media, and calculates completion", async () => {
    const dashboard = await requestAs(student, "get", "/api/v1/me/dashboard");
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.courses).toHaveLength(1);
    expect(dashboard.body.data.courses[0].progressPercent).toBe(0);

    const myCourses = await request(app)
      .get("/api/v1/me/courses?page=1&pageSize=10&status=ACTIVE")
      .set("Authorization", student.authorization);
    expect(myCourses.status).toBe(200);
    expect(myCourses.body.data).toMatchObject({
      page: 1,
      pageSize: 10,
      total: 1,
    });

    const overview = await requestAs(
      student,
      "get",
      `/api/v1/me/courses/${courseId}`,
    );
    expect(overview.status).toBe(200);
    expect(overview.body.data.sections[0].lessons[0].progress.status).toBe(
      "NOT_STARTED",
    );

    const section = await requestAs(
      student,
      "get",
      `/api/v1/learn/courses/${courseId}/sections/${sectionId}`,
    );
    expect(section.status).toBe(200);
    expect(section.body.data.section.lessons[0].id).toBe(lessonId);

    const lesson = await requestAs(
      student,
      "get",
      `/api/v1/learn/lessons/${lessonId}`,
    );
    expect(lesson.status).toBe(200);
    expect(lesson.body.data.canCompleteLesson).toBe(false);
    expect(lesson.body.data.outstandingRequiredCount).toBe(1);
    expect(lesson.body.data.video).toEqual({
      provider: "YOUTUBE",
      videoId: "lamg3tUwct4",
    });
    expect(lesson.body.data.solutionVideo).toEqual({
      provider: "YOUTUBE",
      videoId: "p2qX6g71ZgI",
    });
    expect(JSON.stringify(lesson.body)).not.toContain("must-not-leak");
    expect(lesson.body.data.assets[0].role).toBe("LECTURE_VIDEO");

    const exercise = await requestAs(
      student,
      "get",
      `/api/v1/learn/exercises/${manualExerciseId}`,
    );
    expect(exercise.status).toBe(200);
    expect(exercise.body.data.capabilities).toMatchObject({
      canMarkComplete: true,
      canViewSolutions: true,
    });
    expect(exercise.body.data.assets[0].role).toBe("ANSWER_PDF");
    expect(exercise.body.data.progress.status).toBe("IN_PROGRESS");
    expect(JSON.stringify(exercise.body)).not.toContain("private/learning/");

    const media = await request(app)
      .post("/api/v1/learn/media-access")
      .set("Authorization", student.authorization)
      .send({ assetId: answerAssetId, exerciseId: manualExerciseId });
    expect(media.status).toBe(200);
    expect(media.body.data.url).toMatch(/^https:\/\/media\.example\.test\//);
    expect(storage.signedInputs).toEqual([
      {
        storageKey: expect.stringMatching(/^private\/learning\//),
        mimeType: "application/pdf",
        mediaType: "PDF",
        resourceType: null,
        deliveryType: null,
        format: null,
      },
    ]);
    expect(JSON.stringify(media.body)).not.toContain("storageKey");

    const questionMedia = await request(app)
      .post("/api/v1/learn/media-access")
      .set("Authorization", student.authorization)
      .send({ assetId: questionAssetId, exerciseId: quizExerciseId });
    expect(questionMedia.status).toBe(200);
    expect(storage.signedInputs).toHaveLength(2);

    const exerciseCompletion = await request(app)
      .post(`/api/v1/learn/exercises/${manualExerciseId}/complete`)
      .set("Authorization", student.authorization);
    expect(exerciseCompletion.status).toBe(200);
    expect(exerciseCompletion.body.data).toMatchObject({
      exerciseId: manualExerciseId,
      status: "COMPLETED",
      completionSource: "MANUAL",
    });
    const repeatedCompletion = await request(app)
      .post(`/api/v1/learn/exercises/${manualExerciseId}/complete`)
      .set("Authorization", student.authorization);
    expect(repeatedCompletion.body.data.completedAt).toBe(
      exerciseCompletion.body.data.completedAt,
    );

    const quizCompletion = await request(app)
      .post(`/api/v1/learn/exercises/${quizExerciseId}/complete`)
      .set("Authorization", student.authorization);
    expect(quizCompletion.status).toBe(409);
    expect(quizCompletion.body.error.code).toBe(
      "QUIZ_COMPLETION_REQUIRES_SUBMISSION",
    );

    const lessonCompletion = await request(app)
      .post(`/api/v1/learn/lessons/${lessonId}/complete`)
      .set("Authorization", student.authorization);
    expect(lessonCompletion.status).toBe(200);
    expect(lessonCompletion.body.data).toMatchObject({
      lessonId,
      status: "COMPLETED",
      canComplete: true,
    });

    const progress = await requestAs(
      student,
      "get",
      `/api/v1/learn/courses/${courseId}/progress`,
    );
    expect(progress.body.data).toEqual({
      courseId,
      percent: 100,
      completedLessons: 1,
      totalLessons: 1,
    });
    expect(
      await LessonProgress.countDocuments({
        userId: student.userId,
        status: "COMPLETED",
      }),
    ).toBe(1);
  });

  it("requires the active BE-01 session for student learning routes", async () => {
    const unauthenticated = await request(app).get("/api/v1/me/dashboard");
    expect(unauthenticated.status).toBe(401);

    await UserSession.updateOne(
      { userId: student.userId },
      { $set: { status: "REVOKED", revokedAt: new Date() } },
    );
    const revokedSession = await request(app)
      .get(`/api/v1/learn/courses/${courseId}/progress`)
      .set("Authorization", student.authorization);
    expect(revokedSession.status).toBe(401);
  });

  it("denies missing, expired, revoked, unpublished, and cross-course access", async () => {
    const noEnrollment = await request(app)
      .get(`/api/v1/learn/lessons/${lessonId}`)
      .set("Authorization", secondStudent.authorization);
    expect(noEnrollment.status).toBe(404);

    const answerWithoutEnrollment = await request(app)
      .post("/api/v1/learn/media-access")
      .set("Authorization", secondStudent.authorization)
      .send({ assetId: answerAssetId, exerciseId: manualExerciseId });
    expect(answerWithoutEnrollment.status).toBe(404);

    await enroll(secondStudent.userId, courseId);
    const privateAsset = await request(app)
      .post("/api/v1/learn/media-access")
      .set("Authorization", secondStudent.authorization)
      .send({ assetId: answerAssetId, exerciseId: manualExerciseId });
    expect(privateAsset.status).toBe(200);

    const otherCourse = await createPublishedCourse("german-a2");
    const foreignSection = await CourseSection.create({
      courseId: otherCourse._id,
      title: "Foreign section",
      sectionType: "CHAPTER",
      sortOrder: 1,
      status: "PUBLISHED",
      deletedAt: null,
    });
    const crossCourse = await request(app)
      .get(`/api/v1/learn/courses/${courseId}/sections/${foreignSection._id}`)
      .set("Authorization", student.authorization);
    expect(crossCourse.status).toBe(404);

    const touchedProgress = await request(app)
      .get(`/api/v1/learn/lessons/${lessonId}`)
      .set("Authorization", student.authorization);
    expect(touchedProgress.status).toBe(200);

    await Enrollment.updateOne(
      { userId: student.userId, courseId },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );
    const expired = await request(app)
      .get(`/api/v1/learn/exercises/${manualExerciseId}`)
      .set("Authorization", student.authorization);
    expect(expired.status).toBe(404);
    expect(
      await LessonProgress.countDocuments({
        userId: student.userId,
        lessonId,
      }),
    ).toBe(1);

    await Enrollment.updateOne(
      { userId: student.userId, courseId },
      { $set: { status: "REVOKED", expiresAt: new Date(Date.now() + 60_000) } },
    );
    const revoked = await request(app)
      .get(`/api/v1/me/courses/${courseId}`)
      .set("Authorization", student.authorization);
    expect(revoked.status).toBe(404);

    await Enrollment.updateOne(
      { userId: student.userId, courseId },
      { $set: { status: "ACTIVE" } },
    );
    await Course.updateOne({ _id: courseId }, { $set: { status: "ARCHIVED" } });
    const unpublishedParent = await request(app)
      .get(`/api/v1/learn/lessons/${lessonId}`)
      .set("Authorization", student.authorization);
    expect(unpublishedParent.status).toBe(404);
  });

  it("stores per-student notes, enforces the length limit, and filters unpublished hierarchy rows", async () => {
    await enroll(secondStudent.userId, courseId);
    const emptyNote = await requestAs(
      student,
      "get",
      `/api/v1/learn/lessons/${lessonId}/notes`,
    );
    expect(emptyNote.status).toBe(200);
    expect(emptyNote.body.data.content).toBe("");

    const saved = await request(app)
      .put(`/api/v1/learn/lessons/${lessonId}/notes`)
      .set("Authorization", student.authorization)
      .send({ content: "Remember: Hallo means hello." });
    expect(saved.status).toBe(200);
    expect(await LessonNote.countDocuments({ lessonId })).toBe(1);

    const updated = await request(app)
      .put(`/api/v1/learn/lessons/${lessonId}/notes`)
      .set("Authorization", student.authorization)
      .send({ content: "Updated personal reminder." });
    expect(updated.status).toBe(200);
    expect(updated.body.data.content).toBe("Updated personal reminder.");
    expect(await LessonNote.countDocuments({ lessonId })).toBe(1);

    const otherNote = await requestAs(
      secondStudent,
      "get",
      `/api/v1/learn/lessons/${lessonId}/notes`,
    );
    expect(otherNote.body.data.content).toBe("");
    const invalidNote = await request(app)
      .put(`/api/v1/learn/lessons/${lessonId}/notes`)
      .set("Authorization", student.authorization)
      .send({ content: "x".repeat(10_001) });
    expect(invalidNote.status).toBe(400);

    await Lesson.create({
      sectionId,
      title: "Unpublished lesson",
      content: { text: "not visible" },
      lessonType: "PRACTICE",
      sortOrder: 2,
      status: "DRAFT",
      deletedAt: null,
    });
    await Lesson.create({
      sectionId,
      title: "Deleted lesson",
      content: { text: "deleted content" },
      lessonType: "PRACTICE",
      sortOrder: 3,
      status: "PUBLISHED",
      deletedAt: new Date(),
    });
    const hiddenSection = await CourseSection.create({
      courseId,
      title: "Hidden chapter",
      sectionType: "CHAPTER",
      sortOrder: 2,
      status: "HIDDEN",
      deletedAt: null,
    });
    await Lesson.create({
      sectionId: hiddenSection._id,
      title: "Lesson inside hidden chapter",
      content: { text: "not visible" },
      lessonType: "PRACTICE",
      sortOrder: 1,
      status: "PUBLISHED",
      deletedAt: null,
    });
    const overview = await requestAs(
      student,
      "get",
      `/api/v1/me/courses/${courseId}`,
    );
    expect(overview.status).toBe(200);
    expect(overview.body.data.sections).toHaveLength(1);
    expect(overview.body.data.sections[0].lessons).toHaveLength(1);
    expect(JSON.stringify(overview.body)).not.toContain("not visible");
    expect(JSON.stringify(overview.body)).not.toContain("deleted content");
  });

  it("grades from an immutable snapshot, withholds keys before submission, and supports safe retries", async () => {
    const owner = await request(app)
      .post(`/api/v1/learn/exercises/${quizExerciseId}/quiz-attempts`)
      .set("Authorization", student.authorization)
      .set("Idempotency-Key", "start-quiz-0001");
    expect(owner.status).toBe(201);
    const attemptId = owner.body.data.id as string;
    expect(owner.body.data.questions[0].options).toHaveLength(2);
    expect(JSON.stringify(owner.body)).not.toMatch(
      /isCorrect|correctOption|explanation|points/i,
    );
    expect(await QuizAttempt.countDocuments({ userId: student.userId })).toBe(
      1,
    );

    const replay = await request(app)
      .post(`/api/v1/learn/exercises/${quizExerciseId}/quiz-attempts`)
      .set("Authorization", student.authorization)
      .set("Idempotency-Key", "start-quiz-0001");
    expect(replay.body.data.id).toBe(attemptId);

    const inaccessible = await request(app)
      .get(`/api/v1/learn/quiz-attempts/${attemptId}`)
      .set("Authorization", secondStudent.authorization);
    expect(inaccessible.status).toBe(404);

    const wrongOption = await request(app)
      .put(
        `/api/v1/learn/quiz-attempts/${attemptId}/answers/${owner.body.data.questions[0].id}`,
      )
      .set("Authorization", student.authorization)
      .send({ selectedOptionId: new mongoose.Types.ObjectId().toString() });
    expect(wrongOption.status).toBe(400);
    expect(wrongOption.body.error.code).toBe("QUIZ_OPTION_INVALID");

    const initiallyWrong = await request(app)
      .put(
        `/api/v1/learn/quiz-attempts/${attemptId}/answers/${owner.body.data.questions[0].id}`,
      )
      .set("Authorization", student.authorization)
      .send({ selectedOptionId: wrongOptionId });
    expect(initiallyWrong.status).toBe(200);
    expect(initiallyWrong.body.data.selectedAnswers).toMatchObject({
      [owner.body.data.questions[0].id]: wrongOptionId,
    });

    const selected = await request(app)
      .put(
        `/api/v1/learn/quiz-attempts/${attemptId}/answers/${owner.body.data.questions[0].id}`,
      )
      .set("Authorization", student.authorization)
      .send({ selectedOptionId: correctOptionId });
    expect(selected.status).toBe(200);
    expect(JSON.stringify(selected.body)).not.toMatch(
      /isCorrect|correctOption|explanation|points/i,
    );

    await Quiz.updateOne(
      { _id: quizId },
      {
        $set: { "questions.0.questionText": "Updated question after attempt" },
      },
    );
    const frozenAttempt = await request(app)
      .get(`/api/v1/learn/quiz-attempts/${attemptId}`)
      .set("Authorization", student.authorization);
    expect(frozenAttempt.body.data.questions[0].prompt).toBe(
      "Which word means hello?",
    );

    const submissions = await Promise.all([
      request(app)
        .post(`/api/v1/learn/quiz-attempts/${attemptId}/submit`)
        .set("Authorization", student.authorization),
      request(app)
        .post(`/api/v1/learn/quiz-attempts/${attemptId}/submit`)
        .set("Authorization", student.authorization),
    ]);
    expect(submissions.map((response) => response.status)).toEqual([200, 200]);
    expect(submissions[0]!.body.data).toEqual(submissions[1]!.body.data);
    expect(submissions[0]!.body.data).toMatchObject({
      score: "0.125",
      maxScore: "0.125",
      correctCount: 1,
      totalQuestions: 1,
      passed: true,
    });
    expect(submissions[0]!.body.data.review[0]).toMatchObject({
      selectedOptionId: correctOptionId,
      correctOptionId,
      correctOption: "Hallo",
      explanation: "Hallo is a common German greeting.",
      isCorrect: true,
      awardedPoints: "0.125",
    });
    const completedQuizProgress = await ExerciseProgress.findOne({
      userId: student.userId,
      exerciseId: quizExerciseId,
    });
    expect(completedQuizProgress).toMatchObject({
      status: "COMPLETED",
      completionSource: "QUIZ",
    });
    const originalCompletedAt = completedQuizProgress?.completedAt;
    expect(originalCompletedAt).toBeInstanceOf(Date);
    expect(
      await LessonProgress.findOne({ userId: student.userId, lessonId }).then(
        (row) => row?.status,
      ),
    ).toBeUndefined();

    const result = await requestAs(
      student,
      "get",
      `/api/v1/learn/quiz-attempts/${attemptId}/result`,
    );
    expect(result.status).toBe(200);
    const retry = await request(app)
      .post(`/api/v1/learn/quiz-attempts/${attemptId}/retry`)
      .set("Authorization", student.authorization)
      .set("Idempotency-Key", "retry-quiz-0001");
    expect(retry.status).toBe(201);
    expect(retry.body.data.id).not.toBe(attemptId);
    expect(retry.body.data.questions[0].prompt).toBe(
      "Updated question after attempt",
    );
    const retryReplay = await request(app)
      .post(`/api/v1/learn/quiz-attempts/${attemptId}/retry`)
      .set("Authorization", student.authorization)
      .set("Idempotency-Key", "retry-quiz-0001");
    expect(retryReplay.body.data.id).toBe(retry.body.data.id);

    const completedAgain = await request(app)
      .post(`/api/v1/learn/quiz-attempts/${retry.body.data.id}/submit`)
      .set("Authorization", student.authorization);
    expect(completedAgain.status).toBe(200);
    const completedQuizProgressAfterRetry = await ExerciseProgress.findOne({
      userId: student.userId,
      exerciseId: quizExerciseId,
    });
    expect(completedQuizProgressAfterRetry?.completedAt?.getTime()).toBe(
      originalCompletedAt?.getTime(),
    );

    await Quiz.updateOne(
      { _id: quizId },
      { $set: { showCorrectAnswers: false } },
    );
    const hiddenReviewAttempt = await request(app)
      .post(`/api/v1/learn/exercises/${quizExerciseId}/quiz-attempts`)
      .set("Authorization", student.authorization)
      .set("Idempotency-Key", "start-quiz-0002");
    const hiddenResult = await request(app)
      .post(
        `/api/v1/learn/quiz-attempts/${hiddenReviewAttempt.body.data.id}/submit`,
      )
      .set("Authorization", student.authorization);
    expect(hiddenResult.status).toBe(200);
    expect(hiddenResult.body.data.review).toEqual([]);
    expect(hiddenResult.body.data.score).toBe("0");
    expect(hiddenResult.body.data.passed).toBe(false);
  });

  it("completes required quizzes after low or zero scores and unlocks lesson completion", async () => {
    const lesson = await Lesson.create({
      sectionId,
      title: "Required quiz lesson",
      content: { text: "Practice greetings." },
      lessonType: "PRACTICE",
      sortOrder: 2,
      status: "PUBLISHED",
      deletedAt: null,
    });
    const exercise = await Exercise.create({
      lessonId: lesson._id,
      title: "Required greeting quiz",
      description: null,
      instructions: "Answer both questions.",
      exerciseType: "QUIZ",
      completionMode: "QUIZ_SUBMISSION",
      isRequired: true,
      sortOrder: 1,
      status: "PUBLISHED",
      deletedAt: null,
    });
    const quiz = await Quiz.create({
      exerciseId: exercise._id,
      title: "Two greetings",
      description: null,
      passScorePercent: 100,
      showCorrectAnswers: true,
      questions: [
        {
          questionText: "Greeting one?",
          questionType: "SINGLE_CHOICE",
          explanation: null,
          points: mongoose.Types.Decimal128.fromString("1"),
          sortOrder: 1,
          options: [
            { optionText: "Hallo", isCorrect: true, sortOrder: 1 },
            { optionText: "Tschüss", isCorrect: false, sortOrder: 2 },
          ],
        },
        {
          questionText: "Greeting two?",
          questionType: "SINGLE_CHOICE",
          explanation: null,
          points: mongoose.Types.Decimal128.fromString("1"),
          sortOrder: 2,
          options: [
            { optionText: "Guten Morgen", isCorrect: true, sortOrder: 1 },
            { optionText: "Danke", isCorrect: false, sortOrder: 2 },
          ],
        },
      ],
    });
    const attempt = await request(app)
      .post(`/api/v1/learn/exercises/${exercise._id}/quiz-attempts`)
      .set("Authorization", student.authorization)
      .send({});
    expect(attempt.status).toBe(201);
    const [first, second] = quiz.questions;
    const firstCorrect = first!.options.find((option) => option.isCorrect)!;
    const secondWrong = second!.options.find((option) => !option.isCorrect)!;
    await request(app)
      .put(
        `/api/v1/learn/quiz-attempts/${attempt.body.data.id}/answers/${first!._id}`,
      )
      .set("Authorization", student.authorization)
      .send({ selectedOptionId: firstCorrect._id.toString() });
    await request(app)
      .put(
        `/api/v1/learn/quiz-attempts/${attempt.body.data.id}/answers/${second!._id}`,
      )
      .set("Authorization", student.authorization)
      .send({ selectedOptionId: secondWrong._id.toString() });
    const lowScoreResponses = await Promise.all([
      request(app)
        .post(`/api/v1/learn/quiz-attempts/${attempt.body.data.id}/submit`)
        .set("Authorization", student.authorization),
      request(app)
        .post(`/api/v1/learn/quiz-attempts/${attempt.body.data.id}/submit`)
        .set("Authorization", student.authorization),
    ]);
    expect(lowScoreResponses.map((response) => response.status)).toEqual([
      200, 200,
    ]);
    const lowScore = lowScoreResponses[0]!;
    expect(lowScore.status).toBe(200);
    expect(lowScore.body.data).toMatchObject({ score: "1", passed: false });
    const progress = await ExerciseProgress.findOne({
      userId: student.userId,
      exerciseId: exercise._id,
    });
    expect(progress).toMatchObject({
      status: "COMPLETED",
      completionSource: "QUIZ",
    });
    const completedAt = progress?.completedAt?.getTime();

    const lessonComplete = await request(app)
      .post(`/api/v1/learn/lessons/${lesson._id}/complete`)
      .set("Authorization", student.authorization)
      .send({});
    expect(lessonComplete.status).toBe(200);
    expect(lessonComplete.body.data.status).toBe("COMPLETED");

    const retry = await request(app)
      .post(`/api/v1/learn/quiz-attempts/${attempt.body.data.id}/retry`)
      .set("Authorization", student.authorization)
      .set("Idempotency-Key", "zero-score-retry-001");
    expect(retry.status).toBe(201);
    const retryQuestions = retry.body.data.questions as Array<{
      id: string;
      options: Array<{ id: string }>;
    }>;
    for (const [index, question] of retryQuestions.entries()) {
      await request(app)
        .put(
          `/api/v1/learn/quiz-attempts/${retry.body.data.id}/answers/${question.id}`,
        )
        .set("Authorization", student.authorization)
        .send({ selectedOptionId: question.options[index === 0 ? 1 : 1]!.id });
    }
    const zeroScore = await request(app)
      .post(`/api/v1/learn/quiz-attempts/${retry.body.data.id}/submit`)
      .set("Authorization", student.authorization);
    expect(zeroScore.body.data).toMatchObject({ score: "0", passed: false });
    const afterRetry = await ExerciseProgress.findOne({
      userId: student.userId,
      exerciseId: exercise._id,
    });
    expect(afterRetry?.status).toBe("COMPLETED");
    expect(afterRetry?.completedAt?.getTime()).toBe(completedAt);
    expect(
      (
        await LessonProgress.findOne({
          userId: student.userId,
          lessonId: lesson._id,
        })
      )?.status,
    ).toBe("COMPLETED");
  });

  it("returns 503 until protected media storage is configured and rejects non-students", async () => {
    const unavailableApp = createApp(config, {
      logger: createLogger("test"),
      readiness: () => true,
    });
    const unavailable = await request(unavailableApp)
      .post("/api/v1/learn/media-access")
      .set("Authorization", student.authorization)
      .send({ assetId: answerAssetId, exerciseId: manualExerciseId });
    expect(unavailable.status).toBe(503);
    expect(unavailable.body.error.code).toBe("MEDIA_STORAGE_UNAVAILABLE");

    const wrongAssociation = await request(app)
      .post("/api/v1/learn/media-access")
      .set("Authorization", student.authorization)
      .send({ assetId: answerAssetId, exerciseId: quizExerciseId });
    expect(wrongAssociation.status).toBe(404);

    const admin = await createActor("admin@example.test", "ADMIN");
    const forbidden = await request(app)
      .get(`/api/v1/me/courses/${courseId}`)
      .set("Authorization", admin.authorization);
    expect(forbidden.status).toBe(403);
  });
});
