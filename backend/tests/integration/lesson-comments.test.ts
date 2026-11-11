import { createHash, randomUUID } from "node:crypto";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/application.js";
import type { AppConfig } from "../../src/config/env.js";
import {
  AuditLog,
  Course,
  CourseSection,
  Enrollment,
  Lesson,
  LessonComment,
  LessonCommentEdit,
  User,
  UserSession,
} from "../../src/db/models/index.js";
import { createLogger } from "../../src/http/logger.js";
import { issueAccessToken } from "../../src/modules/auth/jwt.js";
import {
  clearTestDatabase,
  startTestDatabase,
  stopTestDatabase,
} from "../support/test-database.js";

type Actor = { id: string; authorization: string };
let config: AppConfig;
let app: ReturnType<typeof createApp>;
let courseId: string;
let lessonId: string;
let secondLessonId: string;
let student: Actor;
let secondStudent: Actor;
let unentitledStudent: Actor;
let admin: Actor;
let fakeNow: Date;

async function createActor(
  email: string,
  role: "STUDENT" | "ADMIN" = "STUDENT",
) {
  const user = await User.create({
    fullName: role === "ADMIN" ? "Test Admin" : `Student ${email}`,
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
  return { id: user._id.toString(), authorization: `Bearer ${token}` };
}

async function createComment(
  actor: Actor,
  content: string,
  options: {
    anonymous?: boolean;
    parentId?: string | null;
    targetLessonId?: string;
  } = {},
) {
  return request(app)
    .post(
      `/api/v1/learn/lessons/${options.targetLessonId ?? lessonId}/comments`,
    )
    .set("Authorization", actor.authorization)
    .send({
      content,
      isAnonymous: options.anonymous ?? false,
      parentId: options.parentId ?? null,
    });
}

describe("BE-10 lesson comments and discussion management", () => {
  beforeAll(async () => {
    config = await startTestDatabase();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    fakeNow = new Date();
    app = createApp(config, {
      logger: createLogger("test"),
      readiness: () => true,
      lessonCommentsNow: () => new Date(fakeNow),
    });
    student = await createActor("student@example.test");
    secondStudent = await createActor("second@example.test");
    unentitledStudent = await createActor("unentitled@example.test");
    admin = await createActor("admin@example.test", "ADMIN");

    const course = await Course.create({
      code: `COMMENTS-${randomUUID().slice(0, 8)}`,
      title: "German A1",
      slug: `german-a1-${randomUUID().slice(0, 8)}`,
      description: "Test course",
      shortDescription: "Test course",
      objectives: [],
      requirements: [],
      level: "A1",
      thumbnailAssetId: null,
      bannerAssetId: null,
      introVideoAssetId: null,
      price: mongoose.Types.Decimal128.fromString("1000000"),
      accessDurationMonths: 6,
      status: "PUBLISHED",
      sortOrder: 1,
      deletedAt: null,
    });
    courseId = course._id.toString();
    const section = await CourseSection.create({
      courseId: course._id,
      title: "Chapter 1",
      description: "",
      sectionType: "CHAPTER",
      sortOrder: 1,
      status: "PUBLISHED",
      deletedAt: null,
    });
    const lessonInput = {
      sectionId: section._id,
      title: "Say hello",
      description: "",
      content: null,
      video: null,
      solutionVideo: null,
      lessonType: "LECTURE" as const,
      estimatedMinutes: 5,
      countsTowardProgress: true,
      sortOrder: 1,
      status: "PUBLISHED" as const,
      deletedAt: null,
    };
    const lesson = await Lesson.create(lessonInput);
    const secondLesson = await Lesson.create({
      ...lessonInput,
      title: "Say goodbye",
      sortOrder: 2,
    });
    lessonId = lesson._id.toString();
    secondLessonId = secondLesson._id.toString();
    const activatedAt = new Date();
    for (const actor of [student, secondStudent]) {
      await Enrollment.create({
        userId: new mongoose.Types.ObjectId(actor.id),
        courseId: course._id,
        sourceOrderId: null,
        activatedAt,
        expiresAt: new Date(activatedAt.getTime() + 30 * 24 * 60 * 60_000),
        status: "ACTIVE",
      });
    }
  });

  it("keeps anonymous identity out of Student responses and exposes it to Admin", async () => {
    const created = await createComment(student, "Mình chưa hiểu câu này.", {
      anonymous: true,
    });
    expect(created.status).toBe(201);
    expect(created.body.data.author).toEqual({
      displayName: "Học viên ẩn danh",
      avatarUrl: null,
      isAnonymous: true,
      role: "STUDENT",
    });
    const studentJson = JSON.stringify(created.body.data);
    expect(studentJson).not.toContain(student.id);
    expect(studentJson).not.toContain("student@example.test");
    expect(created.body.data).not.toHaveProperty("authorId");

    const listed = await request(app)
      .get(`/api/v1/learn/lessons/${lessonId}/comments`)
      .set("Authorization", secondStudent.authorization);
    expect(listed.status).toBe(200);
    expect(JSON.stringify(listed.body.data)).not.toContain(
      "student@example.test",
    );

    const adminList = await request(app)
      .get("/api/v1/admin/lesson-comments")
      .set("Authorization", admin.authorization);
    expect(adminList.status).toBe(200);
    expect(adminList.body.data.items[0].isAnonymous).toBe(true);
    expect(adminList.body.data.items[0].author).toMatchObject({
      id: student.id,
      email: "student@example.test",
      fullName: "Student student@example.test",
    });
  });

  it("supports nested replies and transactionally soft-deletes the entire subtree", async () => {
    const root = await createComment(student, "Root discussion");
    const child = await createComment(secondStudent, "First reply", {
      parentId: root.body.data.id,
    });
    const nested = await createComment(student, "Nested reply", {
      parentId: child.body.data.id,
    });
    expect(root.status).toBe(201);
    expect(child.status).toBe(201);
    expect(nested.status).toBe(201);
    expect(child.body.data.rootId).toBe(root.body.data.id);
    expect(nested.body.data.parentId).toBe(child.body.data.id);

    const removed = await request(app)
      .delete(`/api/v1/learn/comments/${root.body.data.id}`)
      .set("Authorization", student.authorization);
    expect(removed.status).toBe(200);
    expect(removed.body.data.descendantsDeleted).toBe(2);
    expect(
      await LessonComment.countDocuments({ deletedAt: { $ne: null } }),
    ).toBe(3);

    const rootList = await request(app)
      .get(`/api/v1/learn/lessons/${lessonId}/comments`)
      .set("Authorization", secondStudent.authorization);
    expect(rootList.body.data.items).toHaveLength(0);
    const hiddenReplies = await request(app)
      .get(`/api/v1/learn/comments/${child.body.data.id}/replies`)
      .set("Authorization", secondStudent.authorization);
    expect(hiddenReplies.status).toBe(404);
    const adminDeleted = await request(app)
      .get("/api/v1/admin/lesson-comments?status=DELETED")
      .set("Authorization", admin.authorization);
    expect(adminDeleted.body.data.items).toHaveLength(3);
  });

  it("changes and removes reactions without exposing reactor identities", async () => {
    const comment = await createComment(student, "React to this");
    const reactionUrl = `/api/v1/learn/comments/${comment.body.data.id}/reaction`;
    const love = await request(app)
      .put(reactionUrl)
      .set("Authorization", secondStudent.authorization)
      .send({ reactionType: "LOVE" });
    expect(love.body.data.reactionType).toBe("LOVE");
    const like = await request(app)
      .put(reactionUrl)
      .set("Authorization", secondStudent.authorization)
      .send({ reactionType: "LIKE" });
    expect(like.body.data.reactionType).toBe("LIKE");
    const removed = await request(app)
      .delete(reactionUrl)
      .set("Authorization", secondStudent.authorization);
    expect(removed.body.data.reactionType).toBeNull();
    const list = await request(app)
      .get(`/api/v1/learn/lessons/${lessonId}/comments`)
      .set("Authorization", secondStudent.authorization);
    expect(list.body.data.items[0].reactions).toEqual([]);
    expect(JSON.stringify(list.body.data.items[0])).not.toContain(
      secondStudent.id,
    );
  });

  it("enforces the ten-minute edit boundary and keeps public version history", async () => {
    const created = await createComment(student, "Original text");
    const createdAt = Date.parse(created.body.data.createdAt);
    fakeNow = new Date(createdAt + 9 * 60_000);
    const edited = await request(app)
      .patch(`/api/v1/learn/comments/${created.body.data.id}`)
      .set("Authorization", student.authorization)
      .send({ content: "Updated text", expectedRevision: 1 });
    expect(edited.status).toBe(200);
    expect(edited.body.data.revision).toBe(2);
    expect(edited.body.data.editedAt).not.toBeNull();

    const history = await request(app)
      .get(`/api/v1/learn/comments/${created.body.data.id}/history`)
      .set("Authorization", secondStudent.authorization);
    expect(history.status).toBe(200);
    expect(history.body.data.items).toMatchObject([
      {
        previousContent: "Original text",
        newContent: "Updated text",
        previousRevision: 1,
        newRevision: 2,
      },
    ]);
    expect(JSON.stringify(history.body.data)).not.toContain(student.id);

    fakeNow = new Date(createdAt + 10 * 60_000);
    const expired = await request(app)
      .patch(`/api/v1/learn/comments/${created.body.data.id}`)
      .set("Authorization", student.authorization)
      .send({ content: "Too late", expectedRevision: 2 });
    expect(expired.status).toBe(409);
    expect(expired.body.error.code).toBe("EDIT_WINDOW_EXPIRED");
    expect(
      await LessonCommentEdit.countDocuments({
        commentId: created.body.data.id,
      }),
    ).toBe(1);
  });

  it("hides Admin moderation history from Students and records an audit event", async () => {
    const created = await createComment(student, "An original public version", {
      anonymous: true,
    });
    const moderated = await request(app)
      .patch(`/api/v1/admin/lesson-comments/${created.body.data.id}`)
      .set("Authorization", admin.authorization)
      .send({
        content: "A moderated version",
        expectedRevision: 1,
        reason: "Removed unsafe detail",
      });
    expect(moderated.status).toBe(200);
    expect(moderated.body.data.author.id).toBe(student.id);
    expect(moderated.body.data.isAnonymous).toBe(true);
    expect(moderated.body.data.moderationEditedAt).not.toBeNull();

    const studentHistory = await request(app)
      .get(`/api/v1/learn/comments/${created.body.data.id}/history`)
      .set("Authorization", secondStudent.authorization);
    expect(studentHistory.status).toBe(404);
    const adminHistory = await request(app)
      .get(`/api/v1/admin/lesson-comments/${created.body.data.id}/history`)
      .set("Authorization", admin.authorization);
    expect(adminHistory.body.data[0]).toMatchObject({
      previousContent: "An original public version",
      newContent: "A moderated version",
      reason: "Removed unsafe detail",
      editedBy: { id: admin.id, email: "admin@example.test" },
    });
    expect(
      await AuditLog.countDocuments({ action: "LESSON_COMMENT_EDITED" }),
    ).toBe(1);
  });

  it("rejects unauthorized course access, cross-lesson replies, body identity spoofing, and Student Admin calls", async () => {
    const root = await createComment(student, "Private lesson thread");
    const noEnrollment = await request(app)
      .get(`/api/v1/learn/lessons/${lessonId}/comments`)
      .set("Authorization", unentitledStudent.authorization);
    expect(noEnrollment.status).toBe(404);
    const deniedCreate = await createComment(unentitledStudent, "No access");
    expect(deniedCreate.status).toBe(404);

    const crossLesson = await createComment(secondStudent, "Wrong lesson", {
      parentId: root.body.data.id,
      targetLessonId: secondLessonId,
    });
    expect(crossLesson.status).toBe(404);
    const spoofed = await request(app)
      .post(`/api/v1/learn/lessons/${lessonId}/comments`)
      .set("Authorization", secondStudent.authorization)
      .send({ content: "spoof", authorId: admin.id });
    expect(spoofed.status).toBe(400);
    expect(spoofed.body.error.code).toBe("VALIDATION_ERROR");

    const forbiddenAdmin = await request(app)
      .get("/api/v1/admin/lesson-comments")
      .set("Authorization", student.authorization);
    expect(forbiddenAdmin.status).toBe(403);
  });

  it("rejects a second concurrent edit using the same revision", async () => {
    const created = await createComment(student, "Concurrent edit");
    fakeNow = new Date(Date.parse(created.body.data.createdAt) + 60_000);
    const patch = (content: string) =>
      request(app)
        .patch(`/api/v1/learn/comments/${created.body.data.id}`)
        .set("Authorization", student.authorization)
        .send({ content, expectedRevision: 1 });
    const [first, second] = await Promise.all([
      patch("First winner"),
      patch("Second writer"),
    ]);
    expect(
      [first.status, second.status].filter((statusCode) => statusCode === 200),
    ).toHaveLength(1);
    expect(
      [first.status, second.status].filter((statusCode) => statusCode === 409),
    ).toHaveLength(1);
    expect(
      await LessonCommentEdit.countDocuments({
        commentId: created.body.data.id,
      }),
    ).toBe(1);
  });

  it("supports explicitly disabling Student routes while keeping Admin moderation available", async () => {
    const disabled = createApp(
      { ...config, lessonCommentsEnabled: false },
      { logger: createLogger("test") },
    );
    const studentResponse = await request(disabled)
      .get(`/api/v1/learn/lessons/${lessonId}/comments`)
      .set("Authorization", student.authorization);
    expect(studentResponse.status).toBe(404);
    expect(studentResponse.body.error.code).toBe("FEATURE_DISABLED");
    const adminResponse = await request(disabled)
      .get("/api/v1/admin/lesson-comments/summary")
      .set("Authorization", admin.authorization);
    expect(adminResponse.status).toBe(200);
    expect(await Enrollment.countDocuments({ courseId })).toBe(2);
  });
});
