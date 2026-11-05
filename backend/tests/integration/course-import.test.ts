import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  AuditLog,
  Course,
  CourseSection,
  Exercise,
  Lesson,
} from "../../src/db/models/index.js";
import {
  clearTestDatabase,
  startTestDatabase,
  stopTestDatabase,
} from "../support/test-database.js";
import {
  applyCourseImport,
  buildCourseImportPlan,
} from "../../scripts/course-import/workflow.js";
import { courseImportManifest } from "../../scripts/course-import/manifest.js";

describe("BE-08A course import workflow", () => {
  beforeAll(async () => {
    await startTestDatabase();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  it("creates the approved A1.1 tree, publishes through AdminService, and is idempotent", async () => {
    const preview = await buildCourseImportPlan();
    expect(preview.conflicts).toEqual([]);
    expect(preview.lessons).toHaveLength(9);

    const first = await applyCourseImport();
    expect(first).toMatchObject({
      courses: { created: 1, updated: 0, skipped: 0 },
      sections: { created: 2, updated: 0, skipped: 0 },
      lessons: { created: 9, updated: 0, skipped: 0 },
      duplicates: 0,
      youtubeVideoIdsVerified: 9,
      coursePublished: true,
    });

    const course = await Course.findById(first.courseId).lean();
    expect(course?.price?.toString()).toBe("1000000");
    expect(course?.accessDurationMonths).toBe(6);
    expect(course?.status).toBe("PUBLISHED");
    expect(
      await CourseSection.countDocuments({ courseId: first.courseId }),
    ).toBe(2);
    expect(await Lesson.countDocuments()).toBe(9);
    expect(await Exercise.countDocuments()).toBe(0);
    expect(
      await AuditLog.countDocuments({ "newValue.source": "course-import" }),
    ).toBeGreaterThan(0);

    for (const section of courseImportManifest.sections) {
      const storedSection = await CourseSection.findOne({
        courseId: first.courseId,
        title: section.title,
      }).lean();
      expect(storedSection).not.toBeNull();
      const lessons = await Lesson.find({ sectionId: storedSection!._id })
        .sort({ sortOrder: 1 })
        .lean();
      expect(lessons.map((lesson) => lesson.title)).toEqual(
        section.lessons.map((lesson) => lesson.title),
      );
      expect(lessons.map((lesson) => lesson.video?.videoId)).toEqual(
        section.lessons.map((lesson) => lesson.videoId),
      );
    }

    const second = await applyCourseImport();
    expect(second.courseId).toBe(first.courseId);
    expect(second.courses).toEqual({ created: 0, updated: 0, skipped: 1 });
    expect(second.sections).toEqual({ created: 0, updated: 0, skipped: 2 });
    expect(second.lessons).toEqual({ created: 0, updated: 0, skipped: 9 });
    expect(await Course.countDocuments()).toBe(1);
    expect(await CourseSection.countDocuments()).toBe(2);
    expect(await Lesson.countDocuments()).toBe(9);
  });

  it("stops before writing when an existing course collides with a manifest field", async () => {
    await Course.create({
      code: courseImportManifest.course.code,
      slug: "wrong-slug",
      title: courseImportManifest.course.title,
      description: courseImportManifest.course.description,
      shortDescription: courseImportManifest.course.shortDescription,
      objectives: [],
      requirements: [],
      level: courseImportManifest.course.level,
      price: "1000000",
      accessDurationMonths: 6,
      status: "DRAFT",
      sortOrder: 0,
      deletedAt: null,
    });
    const plan = await buildCourseImportPlan();

    expect(plan.conflicts).toContain(
      "Course slug differs from the import manifest.",
    );
    await expect(applyCourseImport()).rejects.toMatchObject({
      code: "COURSE_IMPORT_CONFLICT",
    });
    expect(await Course.countDocuments()).toBe(1);
    expect(await CourseSection.countDocuments()).toBe(0);
    expect(await Lesson.countDocuments()).toBe(0);
  });
});
