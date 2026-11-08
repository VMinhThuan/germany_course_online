import { Types } from "mongoose";
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
  User,
} from "../../db/models/index.js";
import { AppError, notFound } from "../../shared/errors.js";
import type { MyCoursesQuery } from "./schemas.js";
import { EntitlementService } from "./entitlement.js";
import { courseSummary, safeLessonContent } from "./dto.js";

type PageResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};

type EnrollmentProjection = {
  _id: Types.ObjectId;
  courseId: Types.ObjectId;
  status: "ACTIVE" | "REVOKED";
  activatedAt: Date;
  expiresAt: Date;
};

type EnrollmentDto = {
  id: string;
  courseId: string;
  courseTitle: string;
  status: "ACTIVE" | "REVOKED";
  activatedAt: string | null;
  expiresAt: string;
  progressPercent: number;
};

type ExerciseAssetDto = {
  exerciseId: string;
  assetId: string;
  role: string;
  title: string | null;
  mediaType: string;
  mimeType: string;
  fileSize: number;
  durationSeconds: number | null;
};

function asIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function progressDto(progress: {
  exerciseId: Types.ObjectId;
  status: string;
  completionSource?: string | null;
  completedAt?: Date | null;
}) {
  return {
    exerciseId: progress.exerciseId.toString(),
    status: progress.status,
    completionSource: progress.completionSource ?? null,
    completedAt: asIso(progress.completedAt),
  };
}

function lessonProgressDto(progress: {
  lessonId: Types.ObjectId;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  completedAt?: Date | null;
}) {
  return {
    lessonId: progress.lessonId.toString(),
    status: progress.status,
    completedAt: asIso(progress.completedAt),
  };
}

function duplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export class LearningService {
  private readonly entitlement: EntitlementService;

  constructor(now: () => Date = () => new Date()) {
    this.entitlement = new EntitlementService(now);
  }

  async getDashboard(userId: string) {
    const user = await User.findById(new Types.ObjectId(userId)).lean();
    if (!user) throw notFound();
    const now = new Date();
    const enrollments = await Enrollment.find({
      userId: new Types.ObjectId(userId),
      status: "ACTIVE",
      expiresAt: { $gt: now },
    })
      .sort({ activatedAt: -1, _id: 1 })
      .lean();
    const courses = await this.enrollmentItems(userId, enrollments);
    return {
      profile: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        phone: user.phone ?? null,
        avatarUrl: null,
        role: user.role,
        status: user.status,
      },
      courses,
    };
  }

  async listMyCourses(
    userId: string,
    query: MyCoursesQuery,
  ): Promise<PageResult<EnrollmentDto>> {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
    if (query.status) filter.status = query.status;
    const [enrollments, total] = await Promise.all([
      Enrollment.find(filter)
        .sort({ activatedAt: -1, _id: 1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .lean(),
      Enrollment.countDocuments(filter),
    ]);
    const items = await this.enrollmentItems(userId, enrollments);
    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      hasMore: query.page * query.pageSize < total,
    };
  }

  private async enrollmentItems(
    userId: string,
    enrollments: EnrollmentProjection[],
  ) {
    const courseIds = [
      ...new Map(
        enrollments.map((row) => [row.courseId.toString(), row.courseId]),
      ).values(),
    ];
    const courses = await Course.find({ _id: { $in: courseIds } })
      .select("_id title")
      .lean();
    const courseById = new Map(
      courses.map((course) => [course._id.toString(), course]),
    );
    const progress = await this.progressByCourse(userId, courseIds);
    return Promise.all(
      enrollments.map(async (enrollment) =>
        this.mapEnrollment(
          enrollment,
          courseById.get(enrollment.courseId.toString()),
          progress.get(enrollment.courseId.toString()) ?? 0,
        ),
      ),
    );
  }

  private mapEnrollment(
    enrollment: EnrollmentProjection,
    course: { _id: Types.ObjectId; title: string } | undefined,
    progressPercent: number,
  ) {
    return {
      id: enrollment._id.toString(),
      courseId: enrollment.courseId.toString(),
      courseTitle: course?.title ?? "Course unavailable",
      status: enrollment.status,
      activatedAt: asIso(enrollment.activatedAt),
      expiresAt: enrollment.expiresAt.toISOString(),
      progressPercent,
    };
  }

  private async progressByCourse(userId: string, courseIds: Types.ObjectId[]) {
    const result = new Map<string, number>();
    if (courseIds.length === 0) return result;
    const sections = await CourseSection.find({
      courseId: { $in: courseIds },
      status: "PUBLISHED",
      deletedAt: null,
    })
      .select("_id courseId")
      .lean();
    const sectionToCourse = new Map(
      sections.map((section) => [
        section._id.toString(),
        section.courseId.toString(),
      ]),
    );
    const lessons = await Lesson.find({
      sectionId: { $in: sections.map((section) => section._id) },
      status: "PUBLISHED",
      deletedAt: null,
      countsTowardProgress: true,
    })
      .select("_id sectionId")
      .lean();
    const lessonIdsByCourse = new Map<string, Types.ObjectId[]>();
    for (const lesson of lessons) {
      const courseId = sectionToCourse.get(lesson.sectionId.toString());
      if (!courseId) continue;
      const ids = lessonIdsByCourse.get(courseId) ?? [];
      ids.push(lesson._id);
      lessonIdsByCourse.set(courseId, ids);
    }
    const completed = await LessonProgress.find({
      userId: new Types.ObjectId(userId),
      lessonId: { $in: lessons.map((lesson) => lesson._id) },
      status: "COMPLETED",
    })
      .select("lessonId")
      .lean();
    const completedIds = new Set(
      completed.map((row) => row.lessonId.toString()),
    );
    for (const courseId of courseIds.map((id) => id.toString())) {
      const eligible = lessonIdsByCourse.get(courseId) ?? [];
      const completedCount = eligible.filter((id) =>
        completedIds.has(id.toString()),
      ).length;
      result.set(
        courseId,
        eligible.length === 0
          ? 0
          : Math.round((completedCount / eligible.length) * 10_000) / 100,
      );
    }
    return result;
  }

  async getCourseOverview(userId: string, courseId: string) {
    const { course } = await this.entitlement.assertCourseAccess(
      userId,
      courseId,
    );
    const sections = await CourseSection.find({
      courseId: course._id,
      status: "PUBLISHED",
      deletedAt: null,
    })
      .sort({ sortOrder: 1, _id: 1 })
      .lean();
    const lessons = await Lesson.find({
      sectionId: { $in: sections.map((section) => section._id) },
      status: "PUBLISHED",
      deletedAt: null,
    })
      .sort({ sortOrder: 1, _id: 1 })
      .lean();
    const [outlineExercises, lectureVideoAssets] = await Promise.all([
      Exercise.find({
        lessonId: { $in: lessons.map((lesson) => lesson._id) },
        status: "PUBLISHED",
        deletedAt: null,
      })
        .select("lessonId title sortOrder")
        .sort({ sortOrder: 1, _id: 1 })
        .lean(),
      LessonAsset.find({
        lessonId: { $in: lessons.map((lesson) => lesson._id) },
        assetRole: "LECTURE_VIDEO",
      })
        .select("lessonId")
        .lean(),
    ]);
    const exercisesByLesson = new Map<
      string,
      Array<{ id: string; title: string; sortOrder: number }>
    >();
    for (const exercise of outlineExercises) {
      const lessonKey = exercise.lessonId.toString();
      const rows = exercisesByLesson.get(lessonKey) ?? [];
      rows.push({
        id: exercise._id.toString(),
        title: exercise.title,
        sortOrder: exercise.sortOrder,
      });
      exercisesByLesson.set(lessonKey, rows);
    }
    const lessonsWithVideoAsset = new Set(
      lectureVideoAssets.map((asset) => asset.lessonId.toString()),
    );
    const lessonProgress = await LessonProgress.find({
      userId: new Types.ObjectId(userId),
      lessonId: { $in: lessons.map((lesson) => lesson._id) },
    })
      .select("lessonId status completedAt")
      .lean();
    const progressByLesson = new Map(
      lessonProgress.map((progress) => [
        progress.lessonId.toString(),
        progress,
      ]),
    );
    const lessonsBySection = new Map<string, typeof lessons>();
    for (const lesson of lessons) {
      const key = lesson.sectionId.toString();
      const rows = lessonsBySection.get(key) ?? [];
      rows.push(lesson);
      lessonsBySection.set(key, rows);
    }
    const sectionDtos = sections.map((section) => ({
      id: section._id.toString(),
      title: section.title,
      description: section.description,
      sectionType: section.sectionType,
      sortOrder: section.sortOrder,
      lessons: (lessonsBySection.get(section._id.toString()) ?? []).map(
        (lesson) => ({
          id: lesson._id.toString(),
          title: lesson.title,
          description: lesson.description,
          lessonType: lesson.lessonType,
          estimatedMinutes: lesson.estimatedMinutes,
          countsTowardProgress: lesson.countsTowardProgress,
          sortOrder: lesson.sortOrder,
          hasVideo:
            Boolean(lesson.video) ||
            lessonsWithVideoAsset.has(lesson._id.toString()),
          exercises: exercisesByLesson.get(lesson._id.toString()) ?? [],
          progress: progressByLesson.has(lesson._id.toString())
            ? lessonProgressDto(progressByLesson.get(lesson._id.toString())!)
            : {
                lessonId: lesson._id.toString(),
                status: "NOT_STARTED",
                completedAt: null,
              },
        }),
      ),
    }));
    const progress = await this.courseProgress(
      userId,
      course._id,
      sections,
      lessons.filter((lesson) => lesson.countsTowardProgress),
    );
    return {
      course: courseSummary(
        course,
        sections.filter((section) => section.sectionType === "CHAPTER").length,
        lessons.length,
      ),
      sections: sectionDtos,
      access: "ACTIVE",
      progress,
    };
  }

  async getSection(userId: string, courseId: string, sectionId: string) {
    const { course, section } = await this.entitlement.assertSectionAccess(
      userId,
      courseId,
      sectionId,
    );
    const lessons = await Lesson.find({
      sectionId: section._id,
      status: "PUBLISHED",
      deletedAt: null,
    })
      .sort({ sortOrder: 1, _id: 1 })
      .lean();
    const progress = await LessonProgress.find({
      userId: new Types.ObjectId(userId),
      lessonId: { $in: lessons.map((lesson) => lesson._id) },
    })
      .select("lessonId status completedAt")
      .lean();
    const byLesson = new Map(
      progress.map((row) => [row.lessonId.toString(), row]),
    );
    return {
      courseId: course._id.toString(),
      access: "ACTIVE",
      section: {
        id: section._id.toString(),
        title: section.title,
        description: section.description,
        sectionType: section.sectionType,
        sortOrder: section.sortOrder,
        lessons: lessons.map((lesson) => {
          const saved = byLesson.get(lesson._id.toString());
          return {
            id: lesson._id.toString(),
            title: lesson.title,
            description: lesson.description,
            lessonType: lesson.lessonType,
            estimatedMinutes: lesson.estimatedMinutes,
            countsTowardProgress: lesson.countsTowardProgress,
            sortOrder: lesson.sortOrder,
            progress: saved
              ? lessonProgressDto(saved)
              : {
                  lessonId: lesson._id.toString(),
                  status: "NOT_STARTED",
                  completedAt: null,
                },
          };
        }),
      },
    };
  }

  async getLessonWorkspace(userId: string, lessonId: string) {
    const { course, section, lesson } =
      await this.entitlement.assertLessonAccess(userId, lessonId);
    await this.touchLessonProgress(userId, lesson._id);
    const exercises = await Exercise.find({
      lessonId: lesson._id,
      status: "PUBLISHED",
      deletedAt: null,
    })
      .sort({ sortOrder: 1, _id: 1 })
      .lean();
    const [lessonAssets, exerciseProgress, exerciseAssets] = await Promise.all([
      this.lessonAssetDtos(lesson._id),
      ExerciseProgress.find({
        userId: new Types.ObjectId(userId),
        exerciseId: { $in: exercises.map((exercise) => exercise._id) },
      }).lean(),
      this.exerciseAssetDtos(exercises.map((exercise) => exercise._id)),
    ]);
    const progressByExercise = new Map(
      exerciseProgress.map((progress) => [
        progress.exerciseId.toString(),
        progress,
      ]),
    );
    const assetsByExercise = new Map<string, ExerciseAssetDto[]>();
    for (const asset of exerciseAssets) {
      const rows = assetsByExercise.get(asset.exerciseId) ?? [];
      rows.push(asset);
      assetsByExercise.set(asset.exerciseId, rows);
    }
    const required = exercises.filter((exercise) => exercise.isRequired);
    const missingRequired = required.filter(
      (exercise) =>
        progressByExercise.get(exercise._id.toString())?.status !== "COMPLETED",
    );
    return {
      id: lesson._id.toString(),
      courseId: course._id.toString(),
      sectionId: section._id.toString(),
      title: lesson.title,
      description: lesson.description,
      content: safeLessonContent(lesson.content),
      video:
        lesson.video?.provider === "YOUTUBE" && lesson.video.videoId
          ? { provider: "YOUTUBE", videoId: lesson.video.videoId }
          : null,
      solutionVideo:
        lesson.solutionVideo?.provider === "YOUTUBE" &&
        lesson.solutionVideo.videoId
          ? { provider: "YOUTUBE", videoId: lesson.solutionVideo.videoId }
          : null,
      lessonType: lesson.lessonType,
      estimatedMinutes: lesson.estimatedMinutes,
      countsTowardProgress: lesson.countsTowardProgress,
      assets: lessonAssets,
      media: lessonAssets,
      exercises: exercises.map((exercise) => {
        const assets = assetsByExercise.get(exercise._id.toString()) ?? [];
        const progress = progressByExercise.get(exercise._id.toString());
        return this.exerciseDto(exercise, assets, progress);
      }),
      canCompleteLesson: missingRequired.length === 0,
      outstandingRequiredCount: missingRequired.length,
    };
  }

  async getExercise(userId: string, exerciseId: string) {
    const { exercise } = await this.entitlement.assertExerciseAccess(
      userId,
      exerciseId,
    );
    await this.touchExerciseProgress(userId, exercise._id);
    const [assets, progress] = await Promise.all([
      this.exerciseAssetDtos([exercise._id]),
      ExerciseProgress.findOne({
        userId: new Types.ObjectId(userId),
        exerciseId: exercise._id,
      }).lean(),
    ]);
    return this.exerciseDto(exercise, assets, progress ?? undefined);
  }

  async completeExercise(userId: string, exerciseId: string) {
    const { exercise } = await this.entitlement.assertExerciseAccess(
      userId,
      exerciseId,
    );
    if (
      exercise.exerciseType === "QUIZ" ||
      exercise.completionMode !== "MANUAL"
    ) {
      throw new AppError(
        409,
        "QUIZ_COMPLETION_REQUIRES_SUBMISSION",
        "Quiz exercise completion is controlled by the quiz policy.",
      );
    }
    const progress = await this.markExerciseCompleted(userId, exercise._id);
    return progressDto(progress);
  }

  async completeLesson(userId: string, lessonId: string) {
    const { lesson } = await this.entitlement.assertLessonAccess(
      userId,
      lessonId,
    );
    const requiredExercises = await Exercise.find({
      lessonId: lesson._id,
      isRequired: true,
      status: "PUBLISHED",
      deletedAt: null,
    })
      .select("_id")
      .lean();
    const completed = await ExerciseProgress.find({
      userId: new Types.ObjectId(userId),
      exerciseId: { $in: requiredExercises.map((exercise) => exercise._id) },
      status: "COMPLETED",
    })
      .select("exerciseId")
      .lean();
    const completedIds = new Set(
      completed.map((progress) => progress.exerciseId.toString()),
    );
    const missing = requiredExercises.filter(
      (exercise) => !completedIds.has(exercise._id.toString()),
    );
    if (missing.length > 0) {
      throw new AppError(
        409,
        "COMPLETION_REQUIREMENTS_UNMET",
        "Complete all required exercises before completing this lesson.",
        [{ path: "outstandingRequiredCount", code: String(missing.length) }],
      );
    }
    const progress = await this.markLessonCompleted(userId, lesson._id);
    return {
      ...lessonProgressDto(progress),
      canComplete: true,
    };
  }

  async getCourseProgress(userId: string, courseId: string) {
    const { course } = await this.entitlement.assertCourseAccess(
      userId,
      courseId,
    );
    const sections = await CourseSection.find({
      courseId: course._id,
      status: "PUBLISHED",
      deletedAt: null,
    })
      .select("_id")
      .lean();
    const lessons = await Lesson.find({
      sectionId: { $in: sections.map((section) => section._id) },
      status: "PUBLISHED",
      deletedAt: null,
      countsTowardProgress: true,
    })
      .select("_id sectionId")
      .lean();
    return this.courseProgress(userId, course._id, sections, lessons);
  }

  async getLessonNote(userId: string, lessonId: string) {
    const { lesson } = await this.entitlement.assertLessonAccess(
      userId,
      lessonId,
    );
    const note = await LessonNote.findOne({
      userId: new Types.ObjectId(userId),
      lessonId: lesson._id,
    }).lean();
    return {
      lessonId: lesson._id.toString(),
      content: note?.content ?? "",
      updatedAt: (note?.updatedAt ?? new Date()).toISOString(),
    };
  }

  async saveLessonNote(userId: string, lessonId: string, content: string) {
    const { lesson } = await this.entitlement.assertLessonAccess(
      userId,
      lessonId,
    );
    const filter = { userId: new Types.ObjectId(userId), lessonId: lesson._id };
    let note;
    try {
      note = await LessonNote.findOneAndUpdate(
        filter,
        { $set: { content } },
        {
          returnDocument: "after",
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      ).lean();
    } catch (error) {
      if (!duplicateKey(error)) throw error;
      note = await LessonNote.findOneAndUpdate(
        filter,
        { $set: { content } },
        { returnDocument: "after", runValidators: true },
      ).lean();
    }
    if (!note) throw new Error("Lesson note upsert returned no record.");
    return {
      lessonId: lesson._id.toString(),
      content: note.content,
      updatedAt: note.updatedAt.toISOString(),
    };
  }

  async assertLessonAccess(userId: string, lessonId: string) {
    return this.entitlement.assertLessonAccess(userId, lessonId);
  }

  async assertExerciseAccess(userId: string, exerciseId: string) {
    return this.entitlement.assertExerciseAccess(userId, exerciseId);
  }

  async assertCourseAccess(userId: string, courseId: string) {
    return this.entitlement.assertCourseAccess(userId, courseId);
  }

  async exerciseAssetDtos(exerciseIds: Types.ObjectId[]) {
    if (exerciseIds.length === 0) return [];
    const associations = await ExerciseAsset.find({
      exerciseId: { $in: exerciseIds },
    })
      .sort({ sortOrder: 1, _id: 1 })
      .lean();
    const assets = await MediaAsset.find({
      _id: { $in: associations.map((association) => association.assetId) },
      deletedAt: null,
      uploadStatus: { $nin: ["PENDING", "DELETING", "DELETED"] },
    })
      .select("originalName mediaType mimeType fileSize durationSeconds")
      .lean();
    const byId = new Map(assets.map((asset) => [asset._id.toString(), asset]));
    return associations.flatMap((association) => {
      const asset = byId.get(association.assetId.toString());
      if (!asset) return [];
      return [
        {
          exerciseId: association.exerciseId.toString(),
          assetId: asset._id.toString(),
          role: association.assetRole,
          title: association.title ?? null,
          mediaType: asset.mediaType,
          mimeType: asset.mimeType,
          fileSize: asset.fileSize,
          durationSeconds: asset.durationSeconds ?? null,
        },
      ];
    });
  }

  async lessonAssetDtos(lessonId: Types.ObjectId) {
    const associations = await LessonAsset.find({ lessonId })
      .sort({ sortOrder: 1, _id: 1 })
      .lean();
    const assets = await MediaAsset.find({
      _id: { $in: associations.map((association) => association.assetId) },
      deletedAt: null,
      uploadStatus: { $nin: ["PENDING", "DELETING", "DELETED"] },
    })
      .select("originalName mediaType mimeType fileSize durationSeconds")
      .lean();
    const byId = new Map(assets.map((asset) => [asset._id.toString(), asset]));
    return associations.flatMap((association) => {
      const asset = byId.get(association.assetId.toString());
      if (!asset) return [];
      return [
        {
          lessonId: association.lessonId.toString(),
          assetId: asset._id.toString(),
          role: association.assetRole,
          title: association.title ?? null,
          mediaType: asset.mediaType,
          mimeType: asset.mimeType,
          fileSize: asset.fileSize,
          durationSeconds: asset.durationSeconds ?? null,
        },
      ];
    });
  }

  exerciseDto(
    exercise: {
      _id: Types.ObjectId;
      lessonId: Types.ObjectId;
      title: string;
      description?: string | null;
      instructions: string;
      exerciseType: "FILE_BASED" | "QUIZ";
      completionMode: "MANUAL" | "QUIZ_SUBMISSION";
      isRequired: boolean;
      sortOrder: number;
    },
    assets: ExerciseAssetDto[],
    progress?: {
      exerciseId: Types.ObjectId;
      status: string;
      completionSource?: string | null;
      completedAt?: Date | null;
    },
  ) {
    const completed = progress?.status === "COMPLETED";
    const hasSolutions = assets.some(
      (asset) => asset.role === "ANSWER_PDF" || asset.role === "SOLUTION_VIDEO",
    );
    return {
      id: exercise._id.toString(),
      lessonId: exercise.lessonId.toString(),
      title: exercise.title,
      description: exercise.description ?? null,
      instructions: exercise.instructions,
      exerciseType: exercise.exerciseType,
      completionMode: exercise.completionMode,
      isRequired: exercise.isRequired,
      sortOrder: exercise.sortOrder,
      assets: assets.map(({ exerciseId: _exerciseId, ...asset }) => asset),
      progress: progress ? progressDto(progress) : null,
      capabilities: {
        canMarkComplete:
          exercise.exerciseType === "FILE_BASED" &&
          exercise.completionMode === "MANUAL" &&
          !completed,
        canViewSolutions: hasSolutions,
      },
    };
  }

  private async courseProgress(
    userId: string,
    courseId: Types.ObjectId,
    _sections: Array<{ _id: Types.ObjectId }>,
    eligibleLessons: Array<{ _id: Types.ObjectId }>,
  ) {
    const totalLessons = eligibleLessons.length;
    const completedLessons = await LessonProgress.countDocuments({
      userId: new Types.ObjectId(userId),
      lessonId: { $in: eligibleLessons.map((lesson) => lesson._id) },
      status: "COMPLETED",
    });
    return {
      courseId: courseId.toString(),
      percent:
        totalLessons === 0
          ? 0
          : Math.round((completedLessons / totalLessons) * 10_000) / 100,
      completedLessons,
      totalLessons,
    };
  }

  private async touchLessonProgress(userId: string, lessonId: Types.ObjectId) {
    const filter = { userId: new Types.ObjectId(userId), lessonId };
    const now = new Date();
    let progress;
    try {
      progress = await LessonProgress.findOneAndUpdate(
        filter,
        {
          $set: { lastAccessedAt: now },
          $setOnInsert: {
            userId: new Types.ObjectId(userId),
            lessonId,
            status: "IN_PROGRESS",
            startedAt: now,
            completedAt: null,
          },
        },
        {
          returnDocument: "after",
          upsert: true,
          setDefaultsOnInsert: true,
        },
      );
    } catch (error) {
      if (!duplicateKey(error)) throw error;
      progress = await LessonProgress.findOne(filter);
    }
    if (progress?.status === "NOT_STARTED") {
      progress.status = "IN_PROGRESS";
      progress.startedAt ??= now;
      await progress.save();
    }
    if (!progress) throw new Error("Lesson progress touch returned no record.");
    return progress;
  }

  private async touchExerciseProgress(
    userId: string,
    exerciseId: Types.ObjectId,
  ) {
    const filter = { userId: new Types.ObjectId(userId), exerciseId };
    const now = new Date();
    let progress;
    try {
      progress = await ExerciseProgress.findOneAndUpdate(
        filter,
        {
          $setOnInsert: {
            userId: new Types.ObjectId(userId),
            exerciseId,
            status: "IN_PROGRESS",
            completionSource: null,
            startedAt: now,
            completedAt: null,
          },
        },
        {
          returnDocument: "after",
          upsert: true,
          setDefaultsOnInsert: true,
        },
      );
    } catch (error) {
      if (!duplicateKey(error)) throw error;
      progress = await ExerciseProgress.findOne(filter);
    }
    if (progress?.status === "NOT_STARTED") {
      progress.status = "IN_PROGRESS";
      progress.startedAt ??= now;
      await progress.save();
    }
    if (!progress)
      throw new Error("Exercise progress touch returned no record.");
    return progress;
  }

  private async markExerciseCompleted(
    userId: string,
    exerciseId: Types.ObjectId,
  ) {
    const userObjectId = new Types.ObjectId(userId);
    const now = new Date();
    const filter = {
      userId: userObjectId,
      exerciseId,
      status: { $in: ["NOT_STARTED", "IN_PROGRESS"] as const },
    };
    try {
      const updated = await ExerciseProgress.findOneAndUpdate(
        filter,
        {
          $set: {
            status: "COMPLETED",
            completionSource: "MANUAL",
            completedAt: now,
          },
          $setOnInsert: {
            userId: userObjectId,
            exerciseId,
            startedAt: now,
          },
        },
        {
          returnDocument: "after",
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      );
      if (updated) return updated;
    } catch (error) {
      if (!duplicateKey(error)) throw error;
    }
    const existing = await ExerciseProgress.findOne({
      userId: userObjectId,
      exerciseId,
      status: "COMPLETED",
    });
    if (!existing) throw new Error("Exercise completion did not persist.");
    return existing;
  }

  private async markLessonCompleted(userId: string, lessonId: Types.ObjectId) {
    const userObjectId = new Types.ObjectId(userId);
    const now = new Date();
    const filter = {
      userId: userObjectId,
      lessonId,
      status: { $in: ["NOT_STARTED", "IN_PROGRESS"] as const },
    };
    try {
      const updated = await LessonProgress.findOneAndUpdate(
        filter,
        {
          $set: { status: "COMPLETED", completedAt: now },
          $setOnInsert: {
            userId: userObjectId,
            lessonId,
            startedAt: now,
            lastAccessedAt: null,
          },
        },
        {
          returnDocument: "after",
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      );
      if (updated) return updated;
    } catch (error) {
      if (!duplicateKey(error)) throw error;
    }
    const existing = await LessonProgress.findOne({
      userId: userObjectId,
      lessonId,
      status: "COMPLETED",
    });
    if (!existing) throw new Error("Lesson completion did not persist.");
    return existing;
  }
}
