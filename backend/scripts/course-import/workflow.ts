import { Types } from "mongoose";
import { Course, CourseSection, Lesson } from "../../src/db/models/index.js";
import { AdminService } from "../../src/modules/admin/service.js";
import { UnconfiguredMediaStorage } from "../../src/modules/learning/media-storage.js";
import {
  courseImportManifest as manifest,
  type CourseImportLesson,
  type CourseImportSection,
} from "./manifest.js";

export type ImportCounts = {
  created: number;
  updated: number;
  skipped: number;
};

export type CourseImportReport = {
  courseId: string;
  courses: ImportCounts;
  sections: ImportCounts;
  lessons: ImportCounts;
  duplicates: number;
  youtubeVideoIdsVerified: number;
  coursePublished: boolean;
};

export class CourseImportConflict extends Error {
  readonly code = "COURSE_IMPORT_CONFLICT";

  constructor(readonly conflicts: readonly string[]) {
    super(
      "A1.1 import stopped because existing records conflict with the manifest.",
    );
  }
}

type SectionPlan = {
  manifest: CourseImportSection;
  existingId: Types.ObjectId | null;
  action: "create" | "publish" | "skip";
};

type LessonPlan = {
  manifest: CourseImportLesson;
  section: CourseImportSection;
  existingId: Types.ObjectId | null;
  action: "create" | "update" | "publish" | "skip";
};

type ImportPlan = {
  courseId: Types.ObjectId | null;
  courseAction: "create" | "publish" | "skip";
  sections: SectionPlan[];
  lessons: LessonPlan[];
  conflicts: string[];
  duplicates: number;
};

const systemActor = {
  userId: null,
  ipAddress: null,
  source: "course-import",
} as const;

const admin = new AdminService(new UnconfiguredMediaStorage());

export async function buildCourseImportPlan(): Promise<ImportPlan> {
  const conflicts: string[] = [];
  let duplicates = 0;
  const courseMatches = await Course.find({
    $or: [{ code: manifest.course.code }, { slug: manifest.course.slug }],
  }).lean();
  if (courseMatches.length > 1) {
    duplicates += courseMatches.length - 1;
    conflicts.push("Course code and slug match multiple records.");
  }
  const course = courseMatches[0];
  let courseAction: ImportPlan["courseAction"] = "create";
  if (course) {
    const codeCollision = courseMatches.find(
      (row) => row.code === manifest.course.code && !row._id.equals(course._id),
    );
    const slugCollision = courseMatches.find(
      (row) => row.slug === manifest.course.slug && !row._id.equals(course._id),
    );
    if (codeCollision || slugCollision)
      conflicts.push("Course code and slug resolve to different records.");
    if (course.deletedAt)
      conflicts.push(
        "The matching course is soft-deleted; it will not be restored.",
      );
    if (course.status === "ARCHIVED")
      conflicts.push(
        "The matching course is archived; it will not be republished.",
      );
    for (const [field, expected] of [
      ["code", manifest.course.code],
      ["slug", manifest.course.slug],
      ["title", manifest.course.title],
      ["level", manifest.course.level],
      ["description", manifest.course.description],
      ["shortDescription", manifest.course.shortDescription],
    ] as const) {
      if (course[field] !== expected)
        conflicts.push(`Course ${field} differs from the import manifest.`);
    }
    if (!/^(0|[1-9]\d*)$/.test(String(course.price)))
      conflicts.push("Existing course price is not a valid whole VND amount.");
    if (
      !Number.isInteger(course.accessDurationMonths) ||
      course.accessDurationMonths < 1
    )
      conflicts.push("Existing course access duration is invalid.");
    courseAction = course.status === "PUBLISHED" ? "skip" : "publish";
  }

  const sectionRows = course
    ? await CourseSection.find({ courseId: course._id }).lean()
    : [];
  const sectionPlans: SectionPlan[] = [];
  const sectionIds = new Map<string, Types.ObjectId>();
  for (const expected of manifest.sections) {
    const byTitle = sectionRows.filter((row) => row.title === expected.title);
    const byOrder = sectionRows.filter(
      (row) => row.sortOrder === expected.sortOrder,
    );
    if (byTitle.length > 1 || byOrder.length > 1) {
      duplicates +=
        Math.max(0, byTitle.length - 1) + Math.max(0, byOrder.length - 1);
      conflicts.push(
        `${expected.title} has duplicate title or sort-order records.`,
      );
    }
    const found = byTitle[0] ?? byOrder[0];
    if (byTitle[0] && byOrder[0] && !byTitle[0]._id.equals(byOrder[0]._id))
      conflicts.push(
        `${expected.title} title and sort order resolve to different sections.`,
      );
    if (!found) {
      sectionPlans.push({
        manifest: expected,
        existingId: null,
        action: "create",
      });
      continue;
    }
    sectionIds.set(expected.title, found._id);
    if (found.deletedAt)
      conflicts.push(
        `${expected.title} is soft-deleted; it will not be restored.`,
      );
    if (
      found.title !== expected.title ||
      found.sortOrder !== expected.sortOrder ||
      found.sectionType !== "CHAPTER"
    )
      conflicts.push(
        `${expected.title} has conflicting title, type, or order.`,
      );
    if (found.status === "HIDDEN")
      conflicts.push(
        `${expected.title} is hidden; it will not be republished.`,
      );
    sectionPlans.push({
      manifest: expected,
      existingId: found._id,
      action: found.status === "PUBLISHED" ? "skip" : "publish",
    });
  }
  const expectedSectionTitles = new Set(
    manifest.sections.map((section) => section.title),
  );
  if (
    sectionRows.some(
      (section) =>
        !section.deletedAt &&
        (!expectedSectionTitles.has(section.title) ||
          !manifest.sections.some(
            (expected) => expected.sortOrder === section.sortOrder,
          )),
    )
  )
    conflicts.push(
      "The course contains an additional active section outside this import manifest.",
    );

  const targetVideoIds = manifest.sections.flatMap((section) =>
    section.lessons.map((lesson) => lesson.videoId),
  );
  const existingVideoOwners = await Lesson.find({
    "video.videoId": { $in: targetVideoIds },
  })
    .select("_id sectionId title video.videoId")
    .lean();
  const targetSectionObjectIds = [...sectionIds.values()];
  const lessonRows = targetSectionObjectIds.length
    ? await Lesson.find({ sectionId: { $in: targetSectionObjectIds } }).lean()
    : [];
  const lessonPlans: LessonPlan[] = [];
  for (const sectionManifest of manifest.sections) {
    const sectionId = sectionIds.get(sectionManifest.title);
    const rows = sectionId
      ? lessonRows.filter((row) => row.sectionId.equals(sectionId))
      : [];
    const expectedTitles = new Set(
      sectionManifest.lessons.map((lesson) => lesson.title),
    );
    if (
      rows.some(
        (row) =>
          !row.deletedAt &&
          (!expectedTitles.has(row.title) ||
            !sectionManifest.lessons.some(
              (expected) => expected.sortOrder === row.sortOrder,
            )),
      )
    )
      conflicts.push(
        `${sectionManifest.title} contains an additional active lesson outside this import manifest.`,
      );
    for (const expected of sectionManifest.lessons) {
      const byTitle = rows.filter((row) => row.title === expected.title);
      const byOrder = rows.filter(
        (row) => row.sortOrder === expected.sortOrder,
      );
      if (byTitle.length > 1 || byOrder.length > 1) {
        duplicates +=
          Math.max(0, byTitle.length - 1) + Math.max(0, byOrder.length - 1);
        conflicts.push(
          `${sectionManifest.title}/${expected.title} has duplicate title or order records.`,
        );
      }
      const found = byTitle[0] ?? byOrder[0];
      if (byTitle[0] && byOrder[0] && !byTitle[0]._id.equals(byOrder[0]._id))
        conflicts.push(
          `${sectionManifest.title}/${expected.title} title and order resolve to different lessons.`,
        );
      const videoOwners = existingVideoOwners.filter(
        (row) => row.video?.videoId === expected.videoId,
      );
      if (videoOwners.some((owner) => !found || !owner._id.equals(found._id)))
        conflicts.push(
          `YouTube ID ${expected.videoId} is already assigned to another lesson.`,
        );
      if (!found) {
        lessonPlans.push({
          manifest: expected,
          section: sectionManifest,
          existingId: null,
          action: "create",
        });
        continue;
      }
      if (found.deletedAt)
        conflicts.push(
          `${sectionManifest.title}/${expected.title} is soft-deleted.`,
        );
      if (
        found.title !== expected.title ||
        found.sortOrder !== expected.sortOrder ||
        found.lessonType !== "LECTURE" ||
        found.countsTowardProgress !== true
      )
        conflicts.push(
          `${sectionManifest.title}/${expected.title} has conflicting lesson fields.`,
        );
      if (found.status === "HIDDEN")
        conflicts.push(`${sectionManifest.title}/${expected.title} is hidden.`);
      if (
        found.video &&
        (found.video.provider !== "YOUTUBE" ||
          found.video.videoId !== expected.videoId)
      )
        conflicts.push(
          `${sectionManifest.title}/${expected.title} has a different YouTube ID.`,
        );
      const missingVideo = !found.video;
      const needsPublish = found.status !== "PUBLISHED";
      lessonPlans.push({
        manifest: expected,
        section: sectionManifest,
        existingId: found._id,
        action: missingVideo ? "update" : needsPublish ? "publish" : "skip",
      });
    }
  }

  return {
    courseId: course?._id ?? null,
    courseAction,
    sections: sectionPlans,
    lessons: lessonPlans,
    conflicts,
    duplicates,
  };
}

export async function applyCourseImport(): Promise<CourseImportReport> {
  const plan = await buildCourseImportPlan();
  if (plan.conflicts.length) throw new CourseImportConflict(plan.conflicts);
  const counts = {
    courses: { created: 0, updated: 0, skipped: 0 },
    sections: { created: 0, updated: 0, skipped: 0 },
    lessons: { created: 0, updated: 0, skipped: 0 },
  } satisfies Record<string, ImportCounts>;

  let courseId = plan.courseId?.toString() ?? null;
  if (!courseId) {
    const created = await admin.createCourse(
      {
        ...manifest.course,
        objectives: [],
        requirements: [],
        sortOrder: 0,
      },
      systemActor,
    );
    courseId = created.id!;
    counts.courses.created += 1;
  } else if (plan.courseAction === "skip") {
    counts.courses.skipped += 1;
  }

  const sectionIds = new Map<string, string>();
  for (const sectionPlan of plan.sections) {
    if (sectionPlan.existingId) {
      sectionIds.set(
        sectionPlan.manifest.title,
        sectionPlan.existingId.toString(),
      );
      if (sectionPlan.action === "skip") counts.sections.skipped += 1;
      continue;
    }
    const created = await admin.createSection(
      courseId,
      {
        title: sectionPlan.manifest.title,
        sectionType: "CHAPTER",
        sortOrder: sectionPlan.manifest.sortOrder,
        status: "DRAFT",
      },
      systemActor,
    );
    sectionIds.set(sectionPlan.manifest.title, created.id!);
    counts.sections.created += 1;
  }

  const lessonIds = new Map<string, string>();
  for (const lessonPlan of plan.lessons) {
    const key = `${lessonPlan.section.title}/${lessonPlan.manifest.title}`;
    if (lessonPlan.existingId) {
      lessonIds.set(key, lessonPlan.existingId.toString());
      if (lessonPlan.action === "skip") counts.lessons.skipped += 1;
      continue;
    }
    const sectionId = sectionIds.get(lessonPlan.section.title);
    if (!sectionId) throw new Error("Import plan lost its parent section.");
    const created = await admin.createLesson(
      sectionId,
      {
        title: lessonPlan.manifest.title,
        description: "",
        content: null,
        video: { provider: "YOUTUBE", videoId: lessonPlan.manifest.videoId },
        lessonType: "LECTURE",
        estimatedMinutes: null,
        countsTowardProgress: true,
        sortOrder: lessonPlan.manifest.sortOrder,
        status: "DRAFT",
      },
      systemActor,
    );
    lessonIds.set(key, created.id!);
    counts.lessons.created += 1;
  }

  for (const lessonPlan of plan.lessons) {
    const key = `${lessonPlan.section.title}/${lessonPlan.manifest.title}`;
    const lessonId = lessonIds.get(key);
    if (!lessonId) throw new Error("Import plan lost a lesson ID.");
    if (lessonPlan.action === "skip") continue;
    const isCreated = counts.lessons.created > 0 && !lessonPlan.existingId;
    await admin.updateLesson(
      lessonId,
      {
        ...(lessonPlan.action === "update"
          ? {
              video: {
                provider: "YOUTUBE",
                videoId: lessonPlan.manifest.videoId,
              },
            }
          : {}),
        status: "PUBLISHED",
      },
      systemActor,
    );
    if (!isCreated) counts.lessons.updated += 1;
  }

  for (const sectionPlan of plan.sections) {
    const sectionId = sectionIds.get(sectionPlan.manifest.title);
    if (!sectionId) throw new Error("Import plan lost a section ID.");
    if (sectionPlan.action !== "create" && sectionPlan.action !== "publish")
      continue;
    await admin.updateSection(sectionId, { status: "PUBLISHED" }, systemActor);
    if (sectionPlan.existingId) counts.sections.updated += 1;
  }

  const currentCourse = await Course.findById(courseId).select("status").lean();
  if (!currentCourse) throw new Error("Course disappeared during import.");
  if (currentCourse.status !== "PUBLISHED") {
    await admin.publishCourse(courseId, systemActor);
    if (plan.courseId) counts.courses.updated += 1;
  }

  return verifyCourseImport(courseId, counts);
}

export async function verifyCourseImport(
  knownCourseId?: string,
  counts: Pick<CourseImportReport, "courses" | "sections" | "lessons"> = {
    courses: { created: 0, updated: 0, skipped: 0 },
    sections: { created: 0, updated: 0, skipped: 0 },
    lessons: { created: 0, updated: 0, skipped: 0 },
  },
): Promise<CourseImportReport> {
  const course = knownCourseId
    ? await Course.findById(knownCourseId).lean()
    : await Course.findOne({
        code: manifest.course.code,
        slug: manifest.course.slug,
      }).lean();
  if (!course) throw new Error("Course verification failed: course not found.");
  const sections = await CourseSection.find({
    courseId: course._id,
    deletedAt: null,
  })
    .sort({ sortOrder: 1, _id: 1 })
    .lean();
  if (sections.length !== manifest.sections.length)
    throw new Error(
      "Course verification failed: unexpected active section count.",
    );
  const matchedSections = manifest.sections.map((expected) =>
    sections.filter(
      (section) =>
        section.title === expected.title &&
        section.sortOrder === expected.sortOrder &&
        section.sectionType === "CHAPTER",
    ),
  );
  if (matchedSections.some((rows) => rows.length !== 1))
    throw new Error(
      "Course verification failed: section count or order is invalid.",
    );
  let youtubeVideoIdsVerified = 0;
  for (
    let sectionIndex = 0;
    sectionIndex < manifest.sections.length;
    sectionIndex += 1
  ) {
    const expectedSection = manifest.sections[sectionIndex]!;
    const section = matchedSections[sectionIndex]![0]!;
    if (section.status !== "PUBLISHED")
      throw new Error(
        `Course verification failed: ${expectedSection.title} is not published.`,
      );
    const lessons = await Lesson.find({
      sectionId: section._id,
      deletedAt: null,
    })
      .sort({ sortOrder: 1, _id: 1 })
      .lean();
    if (lessons.length !== expectedSection.lessons.length)
      throw new Error(
        `Course verification failed: ${expectedSection.title} lesson count is invalid.`,
      );
    for (const expectedLesson of expectedSection.lessons) {
      const match = lessons.filter(
        (lesson) =>
          lesson.title === expectedLesson.title &&
          lesson.sortOrder === expectedLesson.sortOrder &&
          lesson.lessonType === "LECTURE" &&
          lesson.countsTowardProgress === true &&
          lesson.video?.provider === "YOUTUBE" &&
          lesson.video.videoId === expectedLesson.videoId,
      );
      if (match.length !== 1 || match[0]!.status !== "PUBLISHED")
        throw new Error(
          `Course verification failed: ${expectedSection.title}/${expectedLesson.title} does not match the manifest.`,
        );
      youtubeVideoIdsVerified += 1;
    }
  }
  const duplicateCourseCount = await Course.countDocuments({
    $or: [{ code: manifest.course.code }, { slug: manifest.course.slug }],
  });
  let duplicateCount = Math.max(0, duplicateCourseCount - 1);
  for (const rows of matchedSections)
    duplicateCount += Math.max(0, rows.length - 1);
  const duplicateVideoLessons = await Lesson.aggregate([
    {
      $match: {
        "video.videoId": {
          $in: manifest.sections.flatMap((section) =>
            section.lessons.map((lesson) => lesson.videoId),
          ),
        },
      },
    },
    { $group: { _id: "$video.videoId", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  duplicateCount += duplicateVideoLessons.reduce(
    (total, row) => total + Number(row.count) - 1,
    0,
  );
  if (duplicateCount !== 0)
    throw new Error(
      "Course verification found duplicate course or section records.",
    );
  if (course.status !== "PUBLISHED")
    throw new Error("Course verification failed: course is not published.");
  return {
    courseId: course._id.toString(),
    courses: counts.courses,
    sections: counts.sections,
    lessons: counts.lessons,
    duplicates: duplicateCount,
    youtubeVideoIdsVerified,
    coursePublished: true,
  };
}

export function summarizeCourseImportPlan(plan: ImportPlan) {
  return {
    conflicts: plan.conflicts,
    duplicates: plan.duplicates,
    course: plan.courseId ? "existing" : "create",
    sections: Object.fromEntries(
      ["create", "publish", "skip"].map((action) => [
        action,
        plan.sections.filter((section) => section.action === action).length,
      ]),
    ),
    lessons: Object.fromEntries(
      ["create", "update", "publish", "skip"].map((action) => [
        action,
        plan.lessons.filter((lesson) => lesson.action === action).length,
      ]),
    ),
  };
}
