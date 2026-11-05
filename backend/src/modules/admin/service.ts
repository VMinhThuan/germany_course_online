import mongoose, { Types } from "mongoose";
import { createHash, randomUUID } from "node:crypto";
import {
  AuditLog,
  Coupon,
  CouponRedemption,
  Course,
  CourseSection,
  Enrollment,
  EnrollmentAdjustment,
  EmailLog,
  Exercise,
  ExerciseAsset,
  Lesson,
  LessonAsset,
  MediaAsset,
  Order,
  RenewalPlan,
  Quiz,
  SiteSettings,
  User,
  UserSession,
} from "../../db/models/index.js";
import { withTransaction } from "../../db/connection.js";
import type { MediaProvider } from "../../config/env.js";
import { AppError, conflict, notFound } from "../../shared/errors.js";
import { addUtcCalendarMonths } from "../commerce/dto.js";
import { normalizeCouponCode } from "../commerce/pricing.js";
import {
  courseDto,
  exerciseDto,
  id,
  iso,
  adminMediaDto,
  lessonDto,
  mediaDto,
  quizDto,
  sectionDto,
} from "./dto.js";
import type {
  CoursePatch,
  ExercisePatch,
  LessonPatch,
  SectionPatch,
  auditListQuerySchema,
  associationWriteSchema,
  couponCreateSchema,
  couponListQuerySchema,
  couponPatchSchema,
  courseListQuerySchema,
  createCourseSchema,
  createExerciseSchema,
  createLessonSchema,
  createSectionSchema,
  enrollmentListQuerySchema,
  enrollmentExtendSchema,
  enrollmentGrantSchema,
  enrollmentReasonSchema,
  enrollmentRestoreSchema,
  exerciseListQuerySchema,
  lessonListQuerySchema,
  mediaListQuerySchema,
  quizWriteSchema,
  renewalPlanCreateSchema,
  renewalPlanListQuerySchema,
  renewalPlanPatchSchema,
  sectionListQuerySchema,
  studentListQuerySchema,
  studentStatusSchema,
  uploadCompleteSchema,
  uploadIntentSchema,
} from "./schemas.js";
import type {
  DeleteMediaInput,
  MediaStorageAdapter,
  MediaResourceType,
} from "../learning/media-storage.js";

export type Actor = { userId: string; ipAddress: string | null };
export type AuditActor =
  Actor | { userId: null; ipAddress: null; source: "course-import" };
type Page<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};
type CourseWrite = typeof createCourseSchema._output;
type SectionWrite = typeof createSectionSchema._output;
type LessonWrite = typeof createLessonSchema._output;
type ExerciseWrite = typeof createExerciseSchema._output;
type QuizWrite = typeof quizWriteSchema._output;
type AssociationWrite = typeof associationWriteSchema._output;
type CourseQuery = typeof courseListQuerySchema._output;
type SectionQuery = typeof sectionListQuerySchema._output;
type LessonQuery = typeof lessonListQuerySchema._output;
type ExerciseQuery = typeof exerciseListQuerySchema._output;
type MediaQuery = typeof mediaListQuerySchema._output;
type StudentQuery = typeof studentListQuerySchema._output;
type EnrollmentQuery = typeof enrollmentListQuerySchema._output;
type RenewalPlanQuery = typeof renewalPlanListQuerySchema._output;
type RenewalPlanCreate = typeof renewalPlanCreateSchema._output;
type RenewalPlanPatch = typeof renewalPlanPatchSchema._output;
type CouponListQuery = typeof couponListQuerySchema._output;
type CouponCreate = typeof couponCreateSchema._output;
type CouponPatch = typeof couponPatchSchema._output;
type EnrollmentGrant = typeof enrollmentGrantSchema._output;
type EnrollmentRestore = typeof enrollmentRestoreSchema._output;
type EnrollmentExtend = typeof enrollmentExtendSchema._output;
type AuditQuery = typeof auditListQuerySchema._output;
type StatusWrite = typeof studentStatusSchema._output;
type UploadIntentWrite = typeof uploadIntentSchema._output;
type UploadCompleteWrite = typeof uploadCompleteSchema._output;
type Doc = Record<string, unknown>;

const readyAssetFilter = {
  deletedAt: null,
  uploadStatus: { $nin: ["PENDING", "DELETING", "DELETED"] },
} as const;

export class AdminService {
  constructor(
    private readonly storage: MediaStorageAdapter,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async listCourses(
    query: CourseQuery,
  ): Promise<Page<ReturnType<typeof courseDto>>> {
    const filter: Record<string, unknown> = { deletedAt: null };
    if (query.status) filter.status = query.status;
    if (query.q) {
      const escaped = escapeRegex(query.q);
      filter.$or = [
        { code: new RegExp(escaped, "i") },
        { title: new RegExp(escaped, "i") },
        { slug: new RegExp(escaped, "i") },
      ];
    }
    const [rows, total] = await Promise.all([
      Course.find(filter)
        .sort({ sortOrder: 1, _id: 1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .lean(),
      Course.countDocuments(filter),
    ]);
    return pageResult(
      rows.map((row) => courseDto(row as unknown as Doc)),
      query,
      total,
    );
  }

  async getCourse(courseId: string) {
    const course = await Course.findOne({
      _id: objectId(courseId),
      deletedAt: null,
    }).lean();
    if (!course) throw notFound("Course not found.");
    return courseDto(course as unknown as Doc);
  }

  async createCourse(input: CourseWrite, actor: AuditActor) {
    try {
      const course = await withTransaction(async (session) => {
        await this.lockCourseMedia(input, session);
        const created = await Course.create(
          [
            {
              code: input.code.toUpperCase(),
              slug: input.slug.toLowerCase(),
              title: input.title,
              description: input.description,
              shortDescription: input.shortDescription,
              objectives: input.objectives,
              requirements: input.requirements,
              level: input.level,
              thumbnailAssetId: input.thumbnailAssetId
                ? objectId(input.thumbnailAssetId)
                : null,
              bannerAssetId: input.bannerAssetId
                ? objectId(input.bannerAssetId)
                : null,
              introVideoAssetId: input.introVideoAssetId
                ? objectId(input.introVideoAssetId)
                : null,
              price: mongoose.Types.Decimal128.fromString(input.price),
              accessDurationMonths: input.accessDurationMonths,
              sortOrder: input.sortOrder,
              status: "DRAFT",
              deletedAt: null,
            },
          ],
          { session },
        );
        const result = created[0]!;
        await audit(
          actor,
          "COURSE_CREATED",
          "COURSE",
          result._id,
          ["created"],
          session,
        );
        return result;
      });
      return courseDto(course.toObject() as unknown as Doc);
    } catch (error) {
      mapDuplicate(error, "Course code or slug already exists.");
      throw error;
    }
  }

  async updateCourse(courseId: string, patch: CoursePatch, actor: Actor) {
    const courseObjectId = objectId(courseId);
    try {
      const result = await withTransaction(async (session) => {
        const course = await Course.findOne({
          _id: courseObjectId,
          deletedAt: null,
        }).session(session);
        if (!course) throw notFound("Course not found.");
        await this.lockCourseMedia(patch, session);
        const oldStatus = course.get("status");
        const fields = Object.keys(patch);
        const update = { ...patch } as Record<string, unknown>;
        if (typeof update.code === "string")
          update.code = update.code.toUpperCase();
        if (typeof update.slug === "string")
          update.slug = update.slug.toLowerCase();
        if (typeof update.price === "string")
          update.price = mongoose.Types.Decimal128.fromString(update.price);
        course.set(update);
        await course.save({ session, validateModifiedOnly: true });
        await audit(
          actor,
          "COURSE_UPDATED",
          "COURSE",
          course._id,
          fields,
          session,
          { oldStatus, newStatus: course.get("status") },
        );
        return course.toObject();
      });
      return courseDto(result as unknown as Doc);
    } catch (error) {
      mapDuplicate(error, "Course code or slug already exists.");
      throw error;
    }
  }

  async deleteCourse(courseId: string, actor: Actor) {
    const oid = objectId(courseId);
    return withTransaction(async (session) => {
      const course = await Course.findById(oid).session(session);
      if (!course) throw notFound("Course not found.");
      if (!course.get("deletedAt")) {
        course.set({ deletedAt: this.now(), status: "ARCHIVED" });
        await course.save({ session });
        await audit(
          actor,
          "COURSE_SOFT_DELETED",
          "COURSE",
          oid,
          ["deletedAt", "status"],
          session,
        );
      }
      return { id: oid.toString(), deleted: true };
    });
  }

  async publishCourse(courseId: string, actor: AuditActor) {
    const oid = objectId(courseId);
    return withTransaction(async (session) => {
      const course = await Course.findOne({
        _id: oid,
        deletedAt: null,
      }).session(session);
      if (!course) throw notFound("Course not found.");
      await this.assertCourseTreePublishable(oid, session);
      course.set("status", "PUBLISHED");
      await course.save({ session });
      await audit(
        actor,
        "COURSE_PUBLISHED",
        "COURSE",
        oid,
        ["status"],
        session,
      );
      return courseDto(course.toObject() as unknown as Doc);
    });
  }

  async listSections(courseId: string, query: SectionQuery) {
    const course = await Course.findOne({
      _id: objectId(courseId),
      deletedAt: null,
    })
      .select("_id")
      .lean();
    if (!course) throw notFound("Course not found.");
    const filter: Record<string, unknown> = {
      courseId: course._id,
      deletedAt: null,
    };
    if (query.status) filter.status = query.status;
    const [rows, total] = await Promise.all([
      CourseSection.find(filter)
        .sort({ sortOrder: 1, _id: 1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .lean(),
      CourseSection.countDocuments(filter),
    ]);
    return pageResult(
      rows.map((row) => sectionDto(row as unknown as Doc)),
      query,
      total,
    );
  }

  async createSection(
    courseId: string,
    input: SectionWrite,
    actor: AuditActor,
  ) {
    const parentId = objectId(courseId);
    return withTransaction(async (session) => {
      const parent = await Course.findOne({ _id: parentId, deletedAt: null })
        .select("_id")
        .session(session);
      if (!parent) throw notFound("Course not found.");
      const [section] = await CourseSection.create(
        [
          {
            ...input,
            courseId: parentId,
            description: input.description ?? "",
            deletedAt: null,
          },
        ],
        { session },
      );
      await audit(
        actor,
        "SECTION_CREATED",
        "COURSE_SECTION",
        section!._id,
        ["created"],
        session,
        { courseId: parentId.toString() },
      );
      return sectionDto(section!.toObject() as unknown as Doc);
    });
  }

  async updateSection(
    sectionId: string,
    patch: SectionPatch,
    actor: AuditActor,
  ) {
    const oid = objectId(sectionId);
    return withTransaction(async (session) => {
      const section = await CourseSection.findOne({
        _id: oid,
        deletedAt: null,
      }).session(session);
      if (!section) throw notFound("Section not found.");
      const parent = await Course.findOne({
        _id: section.get("courseId"),
        deletedAt: null,
      })
        .select("_id")
        .session(session);
      if (!parent) throw notFound("Course not found.");
      section.set(patch);
      if (patch.status === "PUBLISHED")
        await this.assertSectionTreePublishable(section._id, session);
      await section.save({ session, validateModifiedOnly: true });
      await audit(
        actor,
        "SECTION_UPDATED",
        "COURSE_SECTION",
        oid,
        Object.keys(patch),
        session,
      );
      return sectionDto(section.toObject() as unknown as Doc);
    });
  }

  async deleteSection(sectionId: string, actor: Actor) {
    const oid = objectId(sectionId);
    return withTransaction(async (session) => {
      const section = await CourseSection.findById(oid).session(session);
      if (!section) throw notFound("Section not found.");
      if (!section.get("deletedAt")) {
        section.set("deletedAt", this.now());
        await section.save({ session });
        await audit(
          actor,
          "SECTION_SOFT_DELETED",
          "COURSE_SECTION",
          oid,
          ["deletedAt"],
          session,
        );
      }
      return { id: oid.toString(), deleted: true };
    });
  }

  async listLessons(sectionId: string, query: LessonQuery) {
    const section = await CourseSection.findOne({
      _id: objectId(sectionId),
      deletedAt: null,
    })
      .select("_id courseId")
      .lean();
    if (!section) throw notFound("Section not found.");
    if (!(await Course.exists({ _id: section.courseId, deletedAt: null })))
      throw notFound("Course not found.");
    const filter: Record<string, unknown> = {
      sectionId: section._id,
      deletedAt: null,
    };
    if (query.status) filter.status = query.status;
    const [rows, total] = await Promise.all([
      Lesson.find(filter)
        .select("+content")
        .sort({ sortOrder: 1, _id: 1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .lean(),
      Lesson.countDocuments(filter),
    ]);
    return pageResult(
      rows.map((row) => lessonDto(row as unknown as Doc)),
      query,
      total,
    );
  }

  async createLesson(sectionId: string, input: LessonWrite, actor: AuditActor) {
    const parentId = objectId(sectionId);
    return withTransaction(async (session) => {
      const section = await CourseSection.findOne({
        _id: parentId,
        deletedAt: null,
      }).session(session);
      if (!section) throw notFound("Section not found.");
      if (
        !(await Course.exists({
          _id: section.get("courseId"),
          deletedAt: null,
        }).session(session))
      )
        throw notFound("Course not found.");
      const [lesson] = await Lesson.create(
        [
          {
            ...input,
            sectionId: parentId,
            description: input.description ?? "",
            content: input.content ?? null,
            video: input.video ?? null,
            estimatedMinutes: input.estimatedMinutes ?? null,
            deletedAt: null,
          },
        ],
        { session },
      );
      if (input.status === "PUBLISHED")
        await this.assertLessonTreePublishable(lesson!._id, session);
      await audit(
        actor,
        "LESSON_CREATED",
        "LESSON",
        lesson!._id,
        ["created"],
        session,
        { sectionId: parentId.toString() },
      );
      return lessonDto(lesson!.toObject() as unknown as Doc);
    });
  }

  async updateLesson(lessonId: string, patch: LessonPatch, actor: AuditActor) {
    const oid = objectId(lessonId);
    return withTransaction(async (session) => {
      const lesson = await Lesson.findOne({
        _id: oid,
        deletedAt: null,
      }).session(session);
      if (!lesson) throw notFound("Lesson not found.");
      const section = await CourseSection.findOne({
        _id: lesson.get("sectionId"),
        deletedAt: null,
      }).session(session);
      if (
        !section ||
        !(await Course.exists({
          _id: section.get("courseId"),
          deletedAt: null,
        }).session(session))
      )
        throw notFound("Lesson parent not found.");
      lesson.set(patch);
      await lesson.save({ session, validateModifiedOnly: true });
      if (lesson.get("status") === "PUBLISHED")
        await this.assertLessonTreePublishable(oid, session);
      await audit(
        actor,
        "LESSON_UPDATED",
        "LESSON",
        oid,
        Object.keys(patch),
        session,
      );
      return lessonDto(lesson.toObject() as unknown as Doc);
    });
  }

  async deleteLesson(lessonId: string, actor: Actor) {
    const oid = objectId(lessonId);
    return withTransaction(async (session) => {
      const lesson = await Lesson.findById(oid).session(session);
      if (!lesson) throw notFound("Lesson not found.");
      if (!lesson.get("deletedAt")) {
        lesson.set("deletedAt", this.now());
        await lesson.save({ session });
        await audit(
          actor,
          "LESSON_SOFT_DELETED",
          "LESSON",
          oid,
          ["deletedAt"],
          session,
        );
      }
      return { id: oid.toString(), deleted: true };
    });
  }

  async listExercises(lessonId: string, query: ExerciseQuery) {
    const lesson = await Lesson.findOne({
      _id: objectId(lessonId),
      deletedAt: null,
    })
      .select("_id sectionId")
      .lean();
    if (!lesson) throw notFound("Lesson not found.");
    const section = await CourseSection.findOne({
      _id: lesson.sectionId,
      deletedAt: null,
    })
      .select("courseId")
      .lean();
    if (
      !section ||
      !(await Course.exists({ _id: section.courseId, deletedAt: null }))
    )
      throw notFound("Lesson parent not found.");
    const filter: Record<string, unknown> = {
      lessonId: lesson._id,
      deletedAt: null,
    };
    if (query.status) filter.status = query.status;
    const [rows, total] = await Promise.all([
      Exercise.find(filter)
        .sort({ sortOrder: 1, _id: 1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .lean(),
      Exercise.countDocuments(filter),
    ]);
    return pageResult(
      rows.map((row) => exerciseDto(row as unknown as Doc)),
      query,
      total,
    );
  }

  async createExercise(lessonId: string, input: ExerciseWrite, actor: Actor) {
    const parentId = objectId(lessonId);
    return withTransaction(async (session) => {
      const parent = await Lesson.findOne({
        _id: parentId,
        deletedAt: null,
      }).session(session);
      if (!parent) throw notFound("Lesson not found.");
      const section = await CourseSection.findOne({
        _id: parent.get("sectionId"),
        deletedAt: null,
      }).session(session);
      if (
        !section ||
        !(await Course.exists({
          _id: section.get("courseId"),
          deletedAt: null,
        }).session(session))
      )
        throw notFound("Lesson parent not found.");
      assertExerciseCompatibility(input.exerciseType, input.completionMode);
      const [exercise] = await Exercise.create(
        [
          {
            ...input,
            lessonId: parentId,
            description: input.description ?? null,
            deletedAt: null,
          },
        ],
        { session },
      );
      if (input.status === "PUBLISHED")
        await this.assertExercisePublishable(exercise!._id, session);
      await audit(
        actor,
        "EXERCISE_CREATED",
        "EXERCISE",
        exercise!._id,
        ["created"],
        session,
        { lessonId: parentId.toString() },
      );
      return exerciseDto(exercise!.toObject() as unknown as Doc);
    });
  }

  async updateExercise(exerciseId: string, patch: ExercisePatch, actor: Actor) {
    const oid = objectId(exerciseId);
    return withTransaction(async (session) => {
      const exercise = await Exercise.findOne({
        _id: oid,
        deletedAt: null,
      }).session(session);
      if (!exercise) throw notFound("Exercise not found.");
      const lesson = await Lesson.findOne({
        _id: exercise.get("lessonId"),
        deletedAt: null,
      }).session(session);
      const section = lesson
        ? await CourseSection.findOne({
            _id: lesson.get("sectionId"),
            deletedAt: null,
          }).session(session)
        : null;
      if (
        !lesson ||
        !section ||
        !(await Course.exists({
          _id: section.get("courseId"),
          deletedAt: null,
        }).session(session))
      )
        throw notFound("Exercise parent not found.");
      const mergedType =
        patch.exerciseType ?? String(exercise.get("exerciseType"));
      const mergedMode =
        patch.completionMode ?? String(exercise.get("completionMode"));
      assertExerciseCompatibility(mergedType, mergedMode);
      exercise.set(patch);
      await exercise.save({ session, validateModifiedOnly: true });
      if (exercise.get("status") === "PUBLISHED")
        await this.assertExercisePublishable(oid, session);
      await audit(
        actor,
        "EXERCISE_UPDATED",
        "EXERCISE",
        oid,
        Object.keys(patch),
        session,
      );
      return exerciseDto(exercise.toObject() as unknown as Doc);
    });
  }

  async deleteExercise(exerciseId: string, actor: Actor) {
    const oid = objectId(exerciseId);
    return withTransaction(async (session) => {
      const exercise = await Exercise.findById(oid).session(session);
      if (!exercise) throw notFound("Exercise not found.");
      if (!exercise.get("deletedAt")) {
        exercise.set("deletedAt", this.now());
        await exercise.save({ session });
        await audit(
          actor,
          "EXERCISE_SOFT_DELETED",
          "EXERCISE",
          oid,
          ["deletedAt"],
          session,
        );
      }
      return { id: oid.toString(), deleted: true };
    });
  }

  async getQuiz(exerciseId: string) {
    const exercise = await this.getQuizExercise(exerciseId);
    const quiz = await Quiz.findOne({ exerciseId: exercise._id }).lean();
    if (!quiz) throw notFound("Quiz definition not found.");
    return quizDto(quiz as unknown as Doc);
  }

  async replaceQuiz(exerciseId: string, input: QuizWrite, actor: Actor) {
    const exerciseObjectId = objectId(exerciseId);
    validateQuizInput(input);
    return withTransaction(async (session) => {
      const exercise = await this.getQuizExercise(exerciseId, session);
      const existing = await Quiz.findOne({ exerciseId: exercise._id }).session(
        session,
      );
      const existingItemIds = new Set<string>();
      if (existing) {
        for (const question of existing.get("questions") as Array<{
          _id: Types.ObjectId;
          options: Array<{ _id: Types.ObjectId }>;
        }>) {
          existingItemIds.add(question._id.toString());
          for (const option of question.options)
            existingItemIds.add(option._id.toString());
        }
      }
      for (const question of input.questions) {
        if (question.id && !existingItemIds.has(question.id))
          throw new AppError(
            400,
            "INVALID_QUIZ_ITEM_ID",
            "Quiz item id does not belong to this quiz.",
          );
        for (const option of question.options)
          if (option.id && !existingItemIds.has(option.id))
            throw new AppError(
              400,
              "INVALID_QUIZ_ITEM_ID",
              "Quiz option id does not belong to this quiz.",
            );
      }
      const questions = input.questions.map((question) => ({
        ...(question.id ? { _id: new Types.ObjectId(question.id) } : {}),
        questionText: question.questionText,
        questionType: question.questionType,
        explanation: question.explanation ?? null,
        points: mongoose.Types.Decimal128.fromString(question.points),
        sortOrder: question.sortOrder,
        options: question.options.map((option) => ({
          ...(option.id ? { _id: new Types.ObjectId(option.id) } : {}),
          optionText: option.optionText,
          isCorrect: option.isCorrect,
          sortOrder: option.sortOrder,
        })),
      }));
      let quiz;
      if (existing) {
        existing.set({
          title: input.title,
          description: input.description ?? null,
          passScorePercent: input.passScorePercent ?? null,
          showCorrectAnswers: input.showCorrectAnswers,
          questions,
        });
        await existing.save({ session, validateModifiedOnly: true });
        quiz = existing;
      } else {
        const [created] = await Quiz.create(
          [
            {
              exerciseId: exerciseObjectId,
              title: input.title,
              description: input.description ?? null,
              passScorePercent: input.passScorePercent ?? null,
              showCorrectAnswers: input.showCorrectAnswers,
              questions,
            },
          ],
          { session },
        );
        quiz = created!;
      }
      await audit(
        actor,
        "QUIZ_REPLACED",
        "QUIZ",
        quiz._id,
        [
          "title",
          "description",
          "passScorePercent",
          "showCorrectAnswers",
          "questions",
        ],
        session,
      );
      return quizDto(quiz.toObject() as unknown as Doc);
    });
  }

  async listStudents(query: StudentQuery): Promise<Page<Doc>> {
    const filter: Record<string, unknown> = { role: "STUDENT" };
    if (query.status) filter.status = query.status;
    if (query.q) {
      const regex = new RegExp(escapeRegex(query.q), "i");
      filter.$or = [{ fullName: regex }, { email: regex }];
    }
    const [rows, total] = await Promise.all([
      User.find(filter)
        .select(
          "fullName email phone avatarAssetId role status emailVerifiedAt createdAt updatedAt",
        )
        .sort({ createdAt: -1, _id: -1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .lean(),
      User.countDocuments(filter),
    ]);
    return pageResult(
      rows.map((row) => userDto(row as unknown as Doc)),
      query,
      total,
    );
  }

  async getStudent(userId: string) {
    const user = await User.findOne({ _id: objectId(userId), role: "STUDENT" })
      .select(
        "fullName email phone avatarAssetId role status emailVerifiedAt createdAt updatedAt",
      )
      .lean();
    if (!user) throw notFound("Student not found.");
    const userObjectId = user._id;
    const [enrollments, orders] = await Promise.all([
      Enrollment.find({ userId: userObjectId })
        .sort({ activatedAt: -1, _id: 1 })
        .limit(100)
        .lean(),
      Order.find({ userId: userObjectId })
        .sort({ createdAt: -1, _id: -1 })
        .limit(100)
        .lean(),
    ]);
    const courseIds = [
      ...new Set(enrollments.map((row) => row.courseId.toString())),
    ].map((value) => new Types.ObjectId(value));
    const courses = await Course.find({ _id: { $in: courseIds } })
      .select("_id title")
      .lean();
    const courseTitle = new Map(
      courses.map((course) => [course._id.toString(), course.title]),
    );
    return {
      user: userDto(user as unknown as Doc),
      enrollments: enrollments.map((row) =>
        enrollmentDto(
          row as unknown as Doc,
          courseTitle.get(row.courseId.toString()) ?? "Course unavailable",
          this.now(),
        ),
      ),
      orders: orders.map((row) => orderSummary(row as unknown as Doc)),
    };
  }

  async setStudentStatus(userId: string, input: StatusWrite, actor: Actor) {
    const oid = objectId(userId);
    await withTransaction(async (session) => {
      const user = await User.findOne({ _id: oid, role: "STUDENT" }).session(
        session,
      );
      if (!user) throw notFound("Student not found.");
      const previous = user.get("status");
      if (previous === input.status) return;
      user.set("status", input.status);
      await user.save({ session, validateModifiedOnly: true });
      if (input.status === "BLOCKED") {
        await UserSession.updateMany(
          { userId: oid, status: "ACTIVE" },
          {
            $set: {
              status: "REVOKED",
              revokedAt: this.now(),
              revokeReason: "ACCOUNT_BLOCKED",
            },
          },
          { session },
        );
      }
      await audit(
        actor,
        "STUDENT_STATUS_CHANGED",
        "USER",
        oid,
        ["status"],
        session,
        { oldStatus: previous, newStatus: input.status },
      );
    });
    return this.getStudent(userId);
  }

  async listRenewalPlans(courseIdRaw: string, query: RenewalPlanQuery) {
    const courseId = objectId(courseIdRaw);
    if (!(await Course.exists({ _id: courseId })))
      throw notFound("Course not found.");
    const filter: Record<string, unknown> = { courseId };
    if (query.status) filter.status = query.status;
    const [rows, total] = await Promise.all([
      RenewalPlan.find(filter)
        .sort({ sortOrder: 1, _id: 1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .lean(),
      RenewalPlan.countDocuments(filter),
    ]);
    return pageResult(rows.map(renewalPlanDto), query, total);
  }

  async createRenewalPlan(
    courseIdRaw: string,
    input: RenewalPlanCreate,
    actor: Actor,
  ) {
    const courseId = objectId(courseIdRaw);
    const plan = await withTransaction(async (session) => {
      const course = await Course.findOne({ _id: courseId, deletedAt: null })
        .session(session)
        .lean();
      if (!course) throw notFound("Course not found.");
      const [created] = await RenewalPlan.create(
        [
          {
            courseId,
            title: input.title,
            durationMonths: input.durationMonths,
            price: Types.Decimal128.fromString(input.price),
            status: input.status,
            sortOrder: input.sortOrder,
          },
        ],
        { session },
      );
      if (!created) throw new Error("Renewal plan insert returned no record.");
      await audit(
        actor,
        "RENEWAL_PLAN_CREATED",
        "RENEWAL_PLAN",
        created._id,
        ["title", "durationMonths", "price", "status", "sortOrder"],
        session,
        { courseId: courseId.toString(), price: input.price },
      );
      return created.toObject();
    });
    return renewalPlanDto(plan as unknown as Doc);
  }

  async updateRenewalPlan(
    planIdRaw: string,
    input: RenewalPlanPatch,
    actor: Actor,
  ) {
    const planId = objectId(planIdRaw);
    await withTransaction(async (session) => {
      const plan = await RenewalPlan.findById(planId).session(session);
      if (!plan) throw notFound("Renewal plan not found.");
      const old = {
        title: plan.title,
        durationMonths: plan.durationMonths,
        price: plan.price.toString(),
        status: plan.status,
        sortOrder: plan.sortOrder,
      };
      if (input.title !== undefined) plan.title = input.title;
      if (input.durationMonths !== undefined)
        plan.durationMonths = input.durationMonths;
      if (input.price !== undefined)
        plan.price = Types.Decimal128.fromString(input.price);
      if (input.status !== undefined) plan.status = input.status;
      if (input.sortOrder !== undefined) plan.sortOrder = input.sortOrder;
      await plan.save({ session });
      await audit(
        actor,
        "RENEWAL_PLAN_UPDATED",
        "RENEWAL_PLAN",
        planId,
        Object.keys(input),
        session,
        { old, new: { ...old, ...input } },
      );
    });
    return this.listRenewalPlan(planId);
  }

  async deactivateRenewalPlan(planIdRaw: string, actor: Actor) {
    const planId = objectId(planIdRaw);
    await withTransaction(async (session) => {
      const plan = await RenewalPlan.findById(planId).session(session);
      if (!plan) throw notFound("Renewal plan not found.");
      if (plan.status === "INACTIVE") return;
      plan.status = "INACTIVE";
      await plan.save({ session });
      await audit(
        actor,
        "RENEWAL_PLAN_DEACTIVATED",
        "RENEWAL_PLAN",
        planId,
        ["status"],
        session,
        { status: "INACTIVE" },
      );
    });
    return this.listRenewalPlan(planId);
  }

  private async listRenewalPlan(planId: Types.ObjectId) {
    const plan = await RenewalPlan.findById(planId).lean();
    if (!plan) throw notFound("Renewal plan not found.");
    return renewalPlanDto(plan as unknown as Doc);
  }

  async listCoupons(query: CouponListQuery): Promise<Page<Doc>> {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.q)
      filter.code = new RegExp(escapeRegex(normalizeCouponCode(query.q)), "i");
    const [rows, total] = await Promise.all([
      Coupon.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .lean(),
      Coupon.countDocuments(filter),
    ]);
    const ids = rows.map((row) => row._id);
    const reservations = await CouponRedemption.find({
      couponId: { $in: ids },
      status: "RESERVED",
    })
      .sort({ createdAt: 1, _id: 1 })
      .limit(100)
      .lean();
    const orders = await Order.find({
      _id: { $in: reservations.map((row) => row.orderId) },
      status: "PENDING",
    })
      .select(
        "orderCode status orderType courseTitleSnapshot totalAmount createdAt paymentSubmittedAt",
      )
      .lean();
    const ordersById = new Map(orders.map((row) => [row._id.toString(), row]));
    const byCoupon = new Map<string, Doc[]>();
    for (const reservation of reservations) {
      const order = ordersById.get(reservation.orderId.toString());
      if (!order) continue;
      const key = reservation.couponId.toString();
      const list = byCoupon.get(key) ?? [];
      list.push({
        orderId: order._id.toString(),
        orderCode: order.orderCode,
        orderType: order.orderType,
        status: order.status,
        courseTitle: order.courseTitleSnapshot,
        totalAmount: decimal(order.totalAmount),
        createdAt: iso(order.createdAt),
        paymentSubmittedAt: iso(order.paymentSubmittedAt),
      });
      byCoupon.set(key, list);
    }
    const items = rows.map((row) => ({
      ...couponDto(row as unknown as Doc),
      outstandingReservations: byCoupon.get(row._id.toString()) ?? [],
    }));
    return pageResult(items, query, total);
  }

  async createCoupon(input: CouponCreate, actor: Actor) {
    const normalized = normalizeCouponCode(input.code);
    assertCouponWrite(
      normalized,
      input.discountType,
      input.discountValue,
      input.startsAt,
      input.expiresAt,
    );
    const coupon = await withTransaction(async (session) => {
      const [created] = await Coupon.create(
        [
          {
            code: normalized,
            discountType: input.discountType,
            discountValue: Types.Decimal128.fromString(input.discountValue),
            maxDiscount:
              input.maxDiscount == null
                ? null
                : Types.Decimal128.fromString(input.maxDiscount),
            usageLimit: input.usageLimit ?? null,
            startsAt: input.startsAt ? new Date(input.startsAt) : null,
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
            status: input.status,
          },
        ],
        { session },
      );
      if (!created) throw new Error("Coupon insert returned no record.");
      await audit(
        actor,
        "COUPON_CREATED",
        "COUPON",
        created._id,
        ["code", "discountType", "discountValue", "status"],
        session,
        { code: normalized, discountType: input.discountType },
      );
      return created.toObject();
    });
    return couponDto(coupon as unknown as Doc);
  }

  async updateCoupon(couponIdRaw: string, input: CouponPatch, actor: Actor) {
    const couponId = objectId(couponIdRaw);
    await withTransaction(async (session) => {
      const coupon = await Coupon.findById(couponId).session(session);
      if (!coupon) throw notFound("Coupon not found.");
      const merged = {
        code:
          input.code === undefined
            ? coupon.code
            : normalizeCouponCode(input.code),
        discountType: input.discountType ?? coupon.discountType,
        discountValue: input.discountValue ?? coupon.discountValue.toString(),
        startsAt:
          input.startsAt === undefined
            ? coupon.startsAt?.toISOString()
            : input.startsAt,
        expiresAt:
          input.expiresAt === undefined
            ? coupon.expiresAt?.toISOString()
            : input.expiresAt,
      };
      assertCouponWrite(
        merged.code,
        merged.discountType,
        merged.discountValue,
        merged.startsAt,
        merged.expiresAt,
      );
      const old = {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue.toString(),
        maxDiscount: coupon.maxDiscount?.toString() ?? null,
        usageLimit: coupon.usageLimit,
        status: coupon.status,
      };
      coupon.code = merged.code;
      coupon.discountType = merged.discountType;
      coupon.discountValue = Types.Decimal128.fromString(merged.discountValue);
      if (input.maxDiscount !== undefined)
        coupon.maxDiscount =
          input.maxDiscount === null
            ? null
            : Types.Decimal128.fromString(input.maxDiscount);
      if (input.usageLimit !== undefined) coupon.usageLimit = input.usageLimit;
      if (input.startsAt !== undefined)
        coupon.startsAt = input.startsAt ? new Date(input.startsAt) : null;
      if (input.expiresAt !== undefined)
        coupon.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
      if (input.status !== undefined) coupon.status = input.status;
      await coupon.save({ session });
      await audit(
        actor,
        "COUPON_UPDATED",
        "COUPON",
        couponId,
        Object.keys(input),
        session,
        {
          old,
          new: {
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue.toString(),
            maxDiscount: coupon.maxDiscount?.toString() ?? null,
            usageLimit: coupon.usageLimit,
            status: coupon.status,
          },
        },
      );
    });
    const row = await Coupon.findById(couponId).lean();
    if (!row) throw notFound("Coupon not found.");
    return couponDto(row as unknown as Doc);
  }

  async deactivateCoupon(couponIdRaw: string, actor: Actor) {
    const couponId = objectId(couponIdRaw);
    await withTransaction(async (session) => {
      const coupon = await Coupon.findById(couponId).session(session);
      if (!coupon) throw notFound("Coupon not found.");
      if (coupon.status === "INACTIVE") return;
      coupon.status = "INACTIVE";
      await coupon.save({ session });
      await audit(
        actor,
        "COUPON_DEACTIVATED",
        "COUPON",
        couponId,
        ["status"],
        session,
        { status: "INACTIVE" },
      );
    });
    const row = await Coupon.findById(couponId).lean();
    if (!row) throw notFound("Coupon not found.");
    return couponDto(row as unknown as Doc);
  }

  async grantEnrollment(
    input: EnrollmentGrant,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const adminId = objectId(actor.userId);
    const fingerprint = manualEnrollmentFingerprint("GRANT", input);
    const enrollmentId = await this.runManualEnrollmentMutation(
      adminId,
      idempotencyKey,
      fingerprint,
      async (session) => {
        const userId = objectId(input.userId);
        const courseId = objectId(input.courseId);
        const user = await User.findOne({
          _id: userId,
          role: "STUDENT",
          status: "ACTIVE",
        })
          .session(session)
          .lean();
        if (!user) throw notFound("Active student not found.");
        const course = await Course.findOne({
          _id: courseId,
          status: "PUBLISHED",
          deletedAt: null,
        })
          .session(session)
          .lean();
        if (!course) throw notFound("Published course not found.");
        if (await Enrollment.exists({ userId, courseId }).session(session))
          throw new AppError(
            409,
            "ENROLLMENT_ALREADY_EXISTS",
            "This student already has an enrollment; use restore or extend.",
          );
        if (
          await Order.exists({
            userId,
            courseId,
            orderType: "PURCHASE",
            status: "PENDING",
          }).session(session)
        )
          throw new AppError(
            409,
            "PENDING_PURCHASE_EXISTS",
            "Resolve the pending purchase before granting manual access.",
          );
        const now = this.now();
        const expiresAt = addUtcCalendarMonths(now, input.durationMonths);
        const [enrollment] = await Enrollment.create(
          [
            {
              userId,
              courseId,
              sourceOrderId: null,
              activatedAt: now,
              expiresAt,
              status: "ACTIVE",
            },
          ],
          { session },
        );
        if (!enrollment)
          throw new Error("Manual enrollment grant returned no record.");
        const [adjustment] = await EnrollmentAdjustment.create(
          [
            {
              enrollmentId: enrollment._id,
              adjustmentType: "GRANT",
              previousExpiresAt: null,
              newExpiresAt: expiresAt,
              durationMonths: input.durationMonths,
              orderId: null,
              performedById: adminId,
              reason: input.reason,
              idempotencyKey,
              requestFingerprint: fingerprint,
            },
          ],
          { session },
        );
        if (!adjustment)
          throw new Error("Manual grant history returned no record.");
        await audit(
          actor,
          "ENROLLMENT_GRANTED",
          "ENROLLMENT",
          enrollment._id,
          ["status", "expiresAt"],
          session,
          {
            status: "ACTIVE",
            expiresAt: expiresAt.toISOString(),
            reason: input.reason,
          },
        );
        await queueStudentEmail(
          session,
          userId,
          user.email,
          "ENROLLMENT_GRANTED_STUDENT",
          `Course access granted: ${course.title}`,
          {
            courseTitle: course.title,
            durationMonths: input.durationMonths,
            expiresAt: expiresAt.toISOString(),
          },
          `${adjustment._id.toString()}:ENROLLMENT_GRANTED_STUDENT`,
          now,
        );
        return enrollment._id;
      },
    );
    return this.getEnrollment(enrollmentId.toString());
  }

  async revokeEnrollment(
    enrollmentIdRaw: string,
    input: typeof enrollmentReasonSchema._output,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const enrollmentId = objectId(enrollmentIdRaw);
    const adminId = objectId(actor.userId);
    const fingerprint = manualEnrollmentFingerprint("REVOKE", {
      enrollmentId: enrollmentId.toString(),
      ...input,
    });
    const resultId = await this.runManualEnrollmentMutation(
      adminId,
      idempotencyKey,
      fingerprint,
      async (session) => {
        const enrollment = await Enrollment.findById(enrollmentId)
          .session(session)
          .lean();
        if (!enrollment) throw notFound("Enrollment not found.");
        if (enrollment.status !== "ACTIVE")
          throw new AppError(
            409,
            "ENROLLMENT_NOT_ACTIVE",
            "Only an active enrollment can be revoked.",
          );
        const user = await User.findById(enrollment.userId)
          .select("email")
          .session(session)
          .lean();
        const course = await Course.findById(enrollment.courseId)
          .select("title")
          .session(session)
          .lean();
        const now = this.now();
        const cas = await Enrollment.updateOne(
          {
            _id: enrollmentId,
            status: "ACTIVE",
            expiresAt: enrollment.expiresAt,
          },
          { $set: { status: "REVOKED" } },
          { session },
        );
        if (cas.modifiedCount !== 1)
          throw new AppError(
            409,
            "ENROLLMENT_CHANGED",
            "Enrollment changed before revocation.",
          );
        const [adjustment] = await EnrollmentAdjustment.create(
          [
            {
              enrollmentId,
              adjustmentType: "REVOKE",
              previousExpiresAt: enrollment.expiresAt,
              newExpiresAt: enrollment.expiresAt,
              durationMonths: null,
              orderId: null,
              performedById: adminId,
              reason: input.reason,
              idempotencyKey,
              requestFingerprint: fingerprint,
            },
          ],
          { session },
        );
        if (!adjustment)
          throw new Error("Revocation history returned no record.");
        await audit(
          actor,
          "ENROLLMENT_REVOKED",
          "ENROLLMENT",
          enrollmentId,
          ["status"],
          session,
          { oldStatus: "ACTIVE", newStatus: "REVOKED", reason: input.reason },
        );
        if (user && course)
          await queueStudentEmail(
            session,
            enrollment.userId,
            user.email,
            "ENROLLMENT_REVOKED_STUDENT",
            `Course access revoked: ${course.title}`,
            { courseTitle: course.title, reason: input.reason },
            `${adjustment._id.toString()}:ENROLLMENT_REVOKED_STUDENT`,
            now,
          );
        return enrollmentId;
      },
    );
    return this.getEnrollment(resultId.toString());
  }

  async restoreEnrollment(
    enrollmentIdRaw: string,
    input: EnrollmentRestore,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const enrollmentId = objectId(enrollmentIdRaw);
    const adminId = objectId(actor.userId);
    const fingerprint = manualEnrollmentFingerprint("RESTORE", {
      enrollmentId: enrollmentId.toString(),
      ...input,
    });
    const resultId = await this.runManualEnrollmentMutation(
      adminId,
      idempotencyKey,
      fingerprint,
      async (session) => {
        const enrollment = await Enrollment.findById(enrollmentId)
          .session(session)
          .lean();
        if (!enrollment) throw notFound("Enrollment not found.");
        if (enrollment.status !== "REVOKED")
          throw new AppError(
            409,
            "ENROLLMENT_NOT_REVOKED",
            "Only a revoked enrollment can be restored.",
          );
        const now = this.now();
        const expired = enrollment.expiresAt.getTime() <= now.getTime();
        if (expired && !input.extensionMonths)
          throw new AppError(
            422,
            "RESTORE_EXTENSION_REQUIRED",
            "An expired enrollment requires an explicit extensionMonths value.",
          );
        if (!expired && input.extensionMonths !== undefined)
          throw new AppError(
            400,
            "RESTORE_EXTENSION_NOT_NEEDED",
            "Do not supply extensionMonths while the existing access period is still valid.",
          );
        const newExpiresAt = expired
          ? addUtcCalendarMonths(now, input.extensionMonths!)
          : enrollment.expiresAt;
        const user = await User.findById(enrollment.userId)
          .select("email")
          .session(session)
          .lean();
        const course = await Course.findById(enrollment.courseId)
          .select("title")
          .session(session)
          .lean();
        const cas = await Enrollment.updateOne(
          {
            _id: enrollmentId,
            status: "REVOKED",
            expiresAt: enrollment.expiresAt,
          },
          { $set: { status: "ACTIVE", expiresAt: newExpiresAt } },
          { session },
        );
        if (cas.modifiedCount !== 1)
          throw new AppError(
            409,
            "ENROLLMENT_CHANGED",
            "Enrollment changed before restoration.",
          );
        const [adjustment] = await EnrollmentAdjustment.create(
          [
            {
              enrollmentId,
              adjustmentType: "RESTORE",
              previousExpiresAt: enrollment.expiresAt,
              newExpiresAt,
              durationMonths: input.extensionMonths ?? null,
              orderId: null,
              performedById: adminId,
              reason: input.reason,
              idempotencyKey,
              requestFingerprint: fingerprint,
            },
          ],
          { session },
        );
        if (!adjustment) throw new Error("Restore history returned no record.");
        await audit(
          actor,
          "ENROLLMENT_RESTORED",
          "ENROLLMENT",
          enrollmentId,
          ["status", "expiresAt"],
          session,
          {
            oldStatus: "REVOKED",
            newStatus: "ACTIVE",
            expiresAt: newExpiresAt.toISOString(),
            reason: input.reason,
          },
        );
        if (user && course)
          await queueStudentEmail(
            session,
            enrollment.userId,
            user.email,
            "ENROLLMENT_RESTORED_STUDENT",
            `Course access restored: ${course.title}`,
            {
              courseTitle: course.title,
              expiresAt: newExpiresAt.toISOString(),
            },
            `${adjustment._id.toString()}:ENROLLMENT_RESTORED_STUDENT`,
            now,
          );
        return enrollmentId;
      },
    );
    return this.getEnrollment(resultId.toString());
  }

  async extendEnrollment(
    enrollmentIdRaw: string,
    input: EnrollmentExtend,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const enrollmentId = objectId(enrollmentIdRaw);
    const adminId = objectId(actor.userId);
    const fingerprint = manualEnrollmentFingerprint("EXTEND", {
      enrollmentId: enrollmentId.toString(),
      ...input,
    });
    const resultId = await this.runManualEnrollmentMutation(
      adminId,
      idempotencyKey,
      fingerprint,
      async (session) => {
        const enrollment = await Enrollment.findById(enrollmentId)
          .session(session)
          .lean();
        if (!enrollment) throw notFound("Enrollment not found.");
        if (enrollment.status !== "ACTIVE")
          throw new AppError(
            409,
            "ENROLLMENT_REVOKED",
            "Restore a revoked enrollment before extending it.",
          );
        const now = this.now();
        const base = enrollment.expiresAt > now ? enrollment.expiresAt : now;
        const newExpiresAt = addUtcCalendarMonths(base, input.durationMonths);
        const user = await User.findById(enrollment.userId)
          .select("email")
          .session(session)
          .lean();
        const course = await Course.findById(enrollment.courseId)
          .select("title")
          .session(session)
          .lean();
        const cas = await Enrollment.updateOne(
          {
            _id: enrollmentId,
            status: "ACTIVE",
            expiresAt: enrollment.expiresAt,
          },
          { $set: { expiresAt: newExpiresAt } },
          { session },
        );
        if (cas.modifiedCount !== 1)
          throw new AppError(
            409,
            "ENROLLMENT_CHANGED",
            "Enrollment changed before extension.",
          );
        const [adjustment] = await EnrollmentAdjustment.create(
          [
            {
              enrollmentId,
              adjustmentType: "RENEW",
              previousExpiresAt: enrollment.expiresAt,
              newExpiresAt,
              durationMonths: input.durationMonths,
              orderId: null,
              performedById: adminId,
              reason: input.reason,
              idempotencyKey,
              requestFingerprint: fingerprint,
            },
          ],
          { session },
        );
        if (!adjustment)
          throw new Error("Extension history returned no record.");
        await audit(
          actor,
          "ENROLLMENT_EXTENDED",
          "ENROLLMENT",
          enrollmentId,
          ["expiresAt"],
          session,
          {
            previousExpiresAt: enrollment.expiresAt.toISOString(),
            expiresAt: newExpiresAt.toISOString(),
            durationMonths: input.durationMonths,
            reason: input.reason,
          },
        );
        if (user && course)
          await queueStudentEmail(
            session,
            enrollment.userId,
            user.email,
            "ENROLLMENT_EXTENDED_STUDENT",
            `Course access extended: ${course.title}`,
            {
              courseTitle: course.title,
              durationMonths: input.durationMonths,
              expiresAt: newExpiresAt.toISOString(),
            },
            `${adjustment._id.toString()}:ENROLLMENT_EXTENDED_STUDENT`,
            now,
          );
        return enrollmentId;
      },
    );
    return this.getEnrollment(resultId.toString());
  }

  private async runManualEnrollmentMutation(
    adminId: Types.ObjectId,
    idempotencyKey: string,
    fingerprint: string,
    mutate: (session: mongoose.ClientSession) => Promise<Types.ObjectId>,
  ): Promise<Types.ObjectId> {
    try {
      return await withTransaction(async (session) => {
        const existing = await EnrollmentAdjustment.findOne({
          performedById: adminId,
          idempotencyKey,
        })
          .select("+requestFingerprint")
          .session(session)
          .lean();
        if (existing) {
          assertManualFingerprint(existing.requestFingerprint, fingerprint);
          return existing.enrollmentId;
        }
        return mutate(session);
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        const existing = await EnrollmentAdjustment.findOne({
          performedById: adminId,
          idempotencyKey,
        })
          .select("+requestFingerprint")
          .lean();
        if (existing) {
          assertManualFingerprint(existing.requestFingerprint, fingerprint);
          return existing.enrollmentId;
        }
        if (error.message?.includes("uq_enrollments_user_course"))
          throw new AppError(
            409,
            "ENROLLMENT_ALREADY_EXISTS",
            "This student already has an enrollment.",
          );
      }
      throw error;
    }
  }

  async listEnrollments(query: EnrollmentQuery): Promise<Page<Doc>> {
    const filter: Record<string, unknown> = {};
    if (query.userId) filter.userId = objectId(query.userId);
    if (query.courseId) filter.courseId = objectId(query.courseId);
    if (query.status === "ACTIVE") {
      filter.status = "ACTIVE";
      filter.expiresAt = { $gt: this.now() };
    } else if (query.status === "REVOKED") {
      filter.status = "REVOKED";
    }
    if (query.status === "EXPIRED") {
      filter.status = "ACTIVE";
      filter.expiresAt = { $lte: this.now() };
    }
    const [rows, total] = await Promise.all([
      Enrollment.find(filter)
        .sort({ activatedAt: -1, _id: -1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .lean(),
      Enrollment.countDocuments(filter),
    ]);
    const items = await this.enrollmentSummaries(rows as unknown as Doc[]);
    return pageResult(items, query, total);
  }

  async getEnrollment(enrollmentId: string) {
    const enrollment = await Enrollment.findById(objectId(enrollmentId)).lean();
    if (!enrollment) throw notFound("Enrollment not found.");
    const [summary, adjustments] = await Promise.all([
      this.enrollmentSummaries([enrollment as unknown as Doc]).then(
        (rows) => rows[0]!,
      ),
      EnrollmentAdjustment.find({ enrollmentId: enrollment._id })
        .sort({ createdAt: 1, _id: 1 })
        .limit(100)
        .lean(),
    ]);
    return {
      enrollment: summary,
      adjustments: adjustments.map((row) => ({
        id: row._id.toString(),
        adjustmentType: row.adjustmentType,
        previousExpiresAt: iso(row.previousExpiresAt),
        newExpiresAt: iso(row.newExpiresAt),
        durationMonths: row.durationMonths ?? null,
        orderId: id(row.orderId),
        performedById: id(row.performedById),
        reason: row.reason ?? null,
        createdAt: iso(row.createdAt),
      })),
    };
  }

  async listAuditLogs(query: AuditQuery): Promise<Page<Doc>> {
    const filter: Record<string, unknown> = {};
    if (query.entityType) filter.entityType = query.entityType;
    if (query.entityId) filter.entityId = query.entityId;
    if (query.actorUserId) filter.actorUserId = objectId(query.actorUserId);
    if (query.from || query.to) {
      const createdAt: Record<string, Date> = {};
      if (query.from) createdAt.$gte = new Date(query.from);
      if (query.to) createdAt.$lte = new Date(query.to);
      filter.createdAt = createdAt;
    }
    const [rows, total] = await Promise.all([
      AuditLog.find(filter)
        .select("actorUserId action entityType entityId newValue createdAt")
        .sort({ createdAt: -1, _id: -1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);
    const items = rows.map((row) => {
      const snapshot =
        row.newValue && typeof row.newValue === "object"
          ? (row.newValue as Doc)
          : {};
      const changedFields = Array.isArray(snapshot.changedFields)
        ? snapshot.changedFields
            .filter((field): field is string => typeof field === "string")
            .slice(0, 30)
        : [];
      return {
        id: row._id.toString(),
        actorUserId: id(row.actorUserId),
        action: row.action,
        entityType: row.entityType,
        entityId: safeEntityId(row.entityId),
        changedFields,
        createdAt: iso(row.createdAt),
      };
    });
    return pageResult(items, query, total);
  }

  async listMedia(query: MediaQuery): Promise<Page<Doc>> {
    const filter: Record<string, unknown> = {};
    if (query.uploadStatus === "DELETED") {
      filter.uploadStatus = "DELETED";
    } else {
      filter.deletedAt = null;
      filter.uploadStatus = query.uploadStatus ?? {
        $nin: ["PENDING", "DELETING", "DELETED"],
      };
    }
    if (query.mediaType) filter.mediaType = query.mediaType;
    if (query.visibility) filter.visibility = query.visibility;
    if (query.provider) filter.provider = query.provider;
    if (query.q) filter.originalName = new RegExp(escapeRegex(query.q), "i");
    const [rows, total] = await Promise.all([
      MediaAsset.find(filter)
        .select(
          "+provider +storageKey +resourceType +deliveryType +providerAssetId",
        )
        .sort({ createdAt: -1, _id: -1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .lean(),
      MediaAsset.countDocuments(filter),
    ]);
    const usageCounts = await countMediaReferences(
      rows.map((row) => row._id as Types.ObjectId),
    );
    return pageResult(
      rows.map((row) =>
        adminMediaDto(
          row as unknown as Doc,
          usageCounts.get(String(row._id)) ?? 0,
        ),
      ),
      query,
      total,
    );
  }

  async getMediaCapabilities() {
    const provider = this.storage.provider ?? null;
    return {
      activeProvider: provider,
      supportedMediaTypes:
        provider === "CLOUDINARY"
          ? ["PDF", "AUDIO"]
          : provider === "S3_COMPATIBLE"
            ? ["IMAGE", "VIDEO", "PDF", "AUDIO"]
            : [],
    };
  }

  async getMediaAssetDetail(assetId: string) {
    const asset = await MediaAsset.findById(objectId(assetId))
      .select(
        "+provider +storageKey +resourceType +deliveryType +providerAssetId",
      )
      .lean();
    if (!asset) throw notFound("Media asset not found.");
    const [
      usageCounts,
      lessonAssociations,
      exerciseAssociations,
      courses,
      users,
      settings,
    ] = await Promise.all([
      countMediaReferences([asset._id]),
      LessonAsset.find({ assetId: asset._id })
        .select("lessonId assetRole title")
        .lean(),
      ExerciseAsset.find({ assetId: asset._id })
        .select("exerciseId assetRole title")
        .lean(),
      Course.find({
        $or: [
          { thumbnailAssetId: asset._id },
          { bannerAssetId: asset._id },
          { introVideoAssetId: asset._id },
        ],
      })
        .select("title code thumbnailAssetId bannerAssetId introVideoAssetId")
        .lean(),
      User.find({ avatarAssetId: asset._id })
        .select("fullName avatarAssetId")
        .lean(),
      SiteSettings.findOne({
        $or: [{ logoAssetId: asset._id }, { heroAssetId: asset._id }],
      })
        .select("siteName logoAssetId heroAssetId")
        .lean(),
    ]);
    const references = [
      ...lessonAssociations.map((row) => ({
        kind: "LESSON",
        parentId: id(row.lessonId),
        role: String(row.assetRole),
        title: row.title ?? null,
      })),
      ...exerciseAssociations.map((row) => ({
        kind: "EXERCISE",
        parentId: id(row.exerciseId),
        role: String(row.assetRole),
        title: row.title ?? null,
      })),
      ...courses.flatMap((row) =>
        (["thumbnailAssetId", "bannerAssetId", "introVideoAssetId"] as const)
          .filter((field) => id(row[field]) === id(asset._id))
          .map((field) => ({
            kind: "COURSE",
            parentId: id(row._id),
            role: field,
            title: String(row.title),
          })),
      ),
      ...users.map((row) => ({
        kind: "USER_PROFILE",
        parentId: id(row._id),
        role: "AVATAR",
        title: String(row.fullName),
      })),
      ...(settings
        ? (["logoAssetId", "heroAssetId"] as const)
            .filter((field) => id(settings[field]) === id(asset._id))
            .map((field) => ({
              kind: "SITE_SETTINGS",
              parentId: id(settings._id),
              role: field,
              title: String(settings.siteName),
            }))
        : []),
    ];
    return {
      media: adminMediaDto(
        asset as unknown as Doc,
        usageCounts.get(String(asset._id)) ?? 0,
      ),
      references,
    };
  }

  async createMediaPreviewAccess(assetId: string) {
    const asset = await MediaAsset.findOne({
      _id: objectId(assetId),
      ...readyAssetFilter,
    })
      .select(
        "+provider +storageKey +resourceType +deliveryType +providerAssetId",
      )
      .lean();
    if (!asset) throw notFound("Ready media asset not found.");
    const adapter = resolveMediaStorage(this.storage, asset.provider);
    if (!adapter)
      throw mediaUnavailable(
        "The media provider for this asset is not configured.",
      );
    const signed = await adapter.signRead({
      storageKey: asset.storageKey,
      mimeType: asset.mimeType,
      mediaType: asset.mediaType,
      resourceType: asset.resourceType as MediaResourceType | null,
      deliveryType: asset.deliveryType as
        "upload" | "private" | "authenticated" | null,
      format: asset.format ?? null,
    });
    return {
      assetId: id(asset._id),
      url: signed.url,
      expiresAt: signed.expiresAt.toISOString(),
      mediaType: asset.mediaType,
      mimeType: asset.mimeType,
    };
  }

  async createMediaUploadIntent(input: UploadIntentWrite, actor: Actor) {
    if (!this.storage.createUpload)
      throw mediaUnavailable(
        "Media upload is unavailable because no compatible provider is configured.",
      );
    const assetId = new Types.ObjectId();
    const provider = this.storage.provider ?? "S3_COMPATIBLE";
    const storageKey =
      this.storage.createStorageKey?.(
        input.mediaType,
        randomUUID().replaceAll("-", ""),
      ) ?? `media/${randomUUID()}`;
    const resourceType = cloudinaryResourceType(provider, input.mediaType);
    const deliveryType = provider === "CLOUDINARY" ? "authenticated" : null;
    let signed;
    try {
      signed = await this.storage.createUpload({
        storageKey,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        expiresInSeconds: 600,
        mediaType: input.mediaType,
        ...(resourceType ? { resourceType } : {}),
        ...(deliveryType ? { deliveryType } : {}),
        ...(provider === "CLOUDINARY"
          ? { assetFolder: storageKey.slice(0, storageKey.lastIndexOf("/")) }
          : {}),
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw mediaUnavailable();
    }
    await withTransaction(async (session) => {
      await MediaAsset.create(
        [
          {
            _id: assetId,
            originalName: safeOriginalName(input.originalName),
            mediaType: input.mediaType,
            mimeType: input.mimeType,
            fileSize: input.fileSize,
            provider,
            storageKey,
            resourceType,
            deliveryType,
            format: null,
            providerAssetId: null,
            externalMediaId: null,
            durationSeconds: null,
            uploadedById: objectId(actor.userId),
            visibility: input.visibility,
            uploadStatus: "PENDING",
            uploadExpiresAt: signed.expiresAt,
            deletedAt: null,
            referenceRevision: 0,
          },
        ],
        { session },
      );
      await audit(
        actor,
        "MEDIA_UPLOAD_INTENT_CREATED",
        "MEDIA_ASSET",
        assetId,
        ["uploadIntent"],
        session,
        { mediaType: input.mediaType, visibility: input.visibility },
      );
    });
    return {
      assetId: assetId.toString(),
      provider: signed.provider,
      uploadUrl: signed.url,
      uploadMethod: signed.method,
      uploadHeaders: signed.headers ?? {},
      uploadFields: signed.fields ?? {},
      expiresAt: signed.expiresAt.toISOString(),
    };
  }

  async completeMediaUpload(
    assetId: string,
    input: UploadCompleteWrite,
    actor: Actor,
  ) {
    if (input.providerUploadId)
      throw new AppError(
        422,
        "UPLOAD_MODE_UNSUPPORTED",
        "This provider uses single-part PUT uploads and does not accept multipart upload ids.",
      );
    const oid = objectId(assetId);
    const asset = await MediaAsset.findById(oid)
      .select(
        "+provider +storageKey +resourceType +deliveryType +providerAssetId",
      )
      .lean();
    if (!asset || asset.deletedAt || asset.uploadStatus === "DELETED")
      throw notFound("Media upload not found.");
    if (asset.uploadStatus === "READY")
      return adminMediaDto(asset as unknown as Doc, 0);
    if (asset.uploadStatus !== "PENDING")
      throw conflict("Media upload is currently unavailable.");
    if (
      !(asset.uploadExpiresAt instanceof Date) ||
      asset.uploadExpiresAt.getTime() <= this.now().getTime()
    )
      throw new AppError(
        409,
        "UPLOAD_INTENT_EXPIRED",
        "The media upload intent expired.",
      );
    const adapter = resolveMediaStorage(this.storage, asset.provider);
    if (!adapter || (!adapter.verifyUpload && !adapter.headObject))
      throw mediaUnavailable(
        "Upload verification is unavailable for the media provider on this asset.",
      );
    let metadata;
    try {
      metadata = adapter.verifyUpload
        ? await adapter.verifyUpload({
            storageKey: asset.storageKey,
            mimeType: asset.mimeType,
            fileSize: asset.fileSize,
            mediaType: asset.mediaType,
            resourceType: asset.resourceType as MediaResourceType | null,
            deliveryType: asset.deliveryType as
              "upload" | "private" | "authenticated" | null,
          })
        : await adapter.headObject!(asset.storageKey);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw mediaUnavailable("Uploaded object metadata could not be verified.");
    }
    if (!metadata)
      throw new AppError(
        409,
        "UPLOAD_OBJECT_MISSING",
        "The uploaded object was not found.",
      );
    if (
      metadata.contentLength !== asset.fileSize ||
      (asset.provider !== "CLOUDINARY" &&
        metadata.contentType?.toLowerCase() !== asset.mimeType.toLowerCase())
    )
      throw new AppError(
        422,
        "UPLOAD_METADATA_MISMATCH",
        "Uploaded size or content type does not match the upload intent.",
      );
    return withTransaction(async (session) => {
      const current = await MediaAsset.findById(oid)
        .select(
          "+provider +storageKey +resourceType +deliveryType +providerAssetId",
        )
        .session(session);
      if (!current) throw notFound("Media upload not found.");
      if (current.get("uploadStatus") === "READY")
        return adminMediaDto(current.toObject() as unknown as Doc, 0);
      if (current.get("uploadStatus") !== "PENDING")
        throw conflict("Media upload is currently unavailable.");
      current.set({
        uploadStatus: "READY",
        uploadExpiresAt: null,
        ...(metadata.providerAssetId !== undefined
          ? { providerAssetId: metadata.providerAssetId }
          : {}),
        ...(metadata.resourceType !== undefined
          ? { resourceType: metadata.resourceType }
          : {}),
        ...(metadata.deliveryType !== undefined
          ? { deliveryType: metadata.deliveryType }
          : {}),
        ...(metadata.format !== undefined ? { format: metadata.format } : {}),
        ...(metadata.durationSeconds !== undefined
          ? { durationSeconds: metadata.durationSeconds }
          : {}),
      });
      await current.save({ session, validateModifiedOnly: true });
      await audit(
        actor,
        "MEDIA_UPLOAD_COMPLETED",
        "MEDIA_ASSET",
        oid,
        ["uploadStatus"],
        session,
      );
      return adminMediaDto(current.toObject() as unknown as Doc, 0);
    });
  }

  async deleteMediaAsset(assetId: string, actor: Actor) {
    const oid = objectId(assetId);
    const asset = await MediaAsset.findById(oid)
      .select(
        "+provider +storageKey +resourceType +deliveryType +providerAssetId",
      )
      .lean();
    if (!asset) throw notFound("Media asset not found.");
    if (asset.uploadStatus === "DELETED" || asset.deletedAt)
      return { id: oid.toString(), deleted: true };
    const adapter = resolveMediaStorage(this.storage, asset.provider);
    if (!adapter || (!adapter.deleteAsset && !adapter.deleteObject))
      throw mediaUnavailable(
        "Media deletion is unavailable for the provider stored on this asset.",
      );
    await withTransaction(async (session) => {
      const current = await MediaAsset.findById(oid).session(session);
      if (!current) throw notFound("Media asset not found.");
      if (current.get("uploadStatus") === "DELETED" || current.get("deletedAt"))
        return;
      const references = await Promise.all([
        Course.exists({
          $or: [
            { thumbnailAssetId: oid },
            { bannerAssetId: oid },
            { introVideoAssetId: oid },
          ],
        }).session(session),
        User.exists({ avatarAssetId: oid }).session(session),
        SiteSettings.exists({
          $or: [{ logoAssetId: oid }, { heroAssetId: oid }],
        }).session(session),
        LessonAsset.exists({ assetId: oid }).session(session),
        ExerciseAsset.exists({ assetId: oid }).session(session),
      ]);
      if (references.some(Boolean))
        throw conflict(
          "Media asset is still referenced and cannot be deleted.",
        );
      current.set({
        uploadStatus: "DELETING",
        referenceRevision: Number(current.get("referenceRevision") ?? 0) + 1,
      });
      await current.save({ session, validateModifiedOnly: true });
    });
    try {
      const deletion: DeleteMediaInput = {
        storageKey: asset.storageKey,
        mediaType: asset.mediaType,
        resourceType: asset.resourceType as MediaResourceType | null,
        deliveryType: asset.deliveryType as
          "upload" | "private" | "authenticated" | null,
      };
      if (adapter.deleteAsset) await adapter.deleteAsset(deletion);
      else await adapter.deleteObject!(asset.storageKey);
    } catch (error) {
      throw error instanceof AppError
        ? error
        : mediaUnavailable("Media object could not be deleted.");
    }
    await withTransaction(async (session) => {
      const current = await MediaAsset.findById(oid).session(session);
      if (!current) throw notFound("Media asset not found.");
      current.set({ uploadStatus: "DELETED", deletedAt: this.now() });
      await current.save({ session, validateModifiedOnly: true });
      await audit(
        actor,
        "MEDIA_ASSET_DELETED",
        "MEDIA_ASSET",
        oid,
        ["deletedAt", "uploadStatus"],
        session,
      );
    });
    return { id: oid.toString(), deleted: true };
  }

  async linkLessonAsset(
    lessonId: string,
    assetId: string,
    input: AssociationWrite,
    actor: Actor,
  ) {
    return this.linkAsset("lesson", lessonId, assetId, input, actor);
  }

  async linkExerciseAsset(
    exerciseId: string,
    assetId: string,
    input: AssociationWrite,
    actor: Actor,
  ) {
    return this.linkAsset("exercise", exerciseId, assetId, input, actor);
  }

  async listLessonAssets(lessonId: string) {
    const oid = objectId(lessonId);
    await this.requireLiveLesson(oid);
    const rows = await LessonAsset.find({ lessonId: oid })
      .sort({ sortOrder: 1, _id: 1 })
      .limit(100)
      .lean();
    return this.populateAssociationAssets(rows as unknown as Doc[], "lesson");
  }

  async listExerciseAssets(exerciseId: string) {
    const oid = objectId(exerciseId);
    await this.requireLiveExercise(oid);
    const rows = await ExerciseAsset.find({ exerciseId: oid })
      .sort({ sortOrder: 1, _id: 1 })
      .limit(100)
      .lean();
    return this.populateAssociationAssets(rows as unknown as Doc[], "exercise");
  }

  async unlinkLessonAsset(
    lessonId: string,
    assetId: string,
    assetRole: string,
    actor: Actor,
  ) {
    return this.unlinkAsset("lesson", lessonId, assetId, assetRole, actor);
  }

  async unlinkExerciseAsset(
    exerciseId: string,
    assetId: string,
    assetRole: string,
    actor: Actor,
  ) {
    return this.unlinkAsset("exercise", exerciseId, assetId, assetRole, actor);
  }

  private async lockCourseMedia(
    input: Partial<CourseWrite> | CoursePatch,
    session: mongoose.ClientSession,
  ) {
    for (const [field, expectedType] of [
      ["thumbnailAssetId", "IMAGE"],
      ["bannerAssetId", "IMAGE"],
      ["introVideoAssetId", "VIDEO"],
    ] as const) {
      const assetId = input[field];
      if (assetId === undefined || assetId === null) continue;
      const oid = objectId(assetId);
      const asset = await MediaAsset.findOne({ _id: oid, ...readyAssetFilter })
        .select("mediaType")
        .session(session)
        .lean();
      if (!asset) throw notFound("Referenced media asset is unavailable.");
      if (asset.mediaType !== expectedType)
        throw new AppError(
          422,
          "INVALID_MEDIA_ASSOCIATION",
          `${field} requires ${expectedType} media.`,
        );
      const locked = await MediaAsset.updateOne(
        { _id: oid, ...readyAssetFilter },
        { $inc: { referenceRevision: 1 } },
        { session },
      );
      if (locked.modifiedCount !== 1)
        throw conflict("Referenced media asset is no longer available.");
    }
  }

  private async assertCourseTreePublishable(
    courseId: Types.ObjectId,
    session: mongoose.ClientSession,
  ) {
    const sections = await CourseSection.find({
      courseId,
      deletedAt: null,
      status: "PUBLISHED",
    })
      .select("_id")
      .session(session)
      .lean();
    if (!sections.length) return;
    const lessons = await Lesson.find({
      sectionId: { $in: sections.map((row) => row._id) },
      deletedAt: null,
      status: "PUBLISHED",
    })
      .select("_id")
      .session(session)
      .lean();
    for (const lesson of lessons)
      await this.assertLessonTreePublishable(lesson._id, session);
  }

  private async assertSectionTreePublishable(
    sectionId: Types.ObjectId,
    session: mongoose.ClientSession,
  ) {
    const lessons = await Lesson.find({
      sectionId,
      deletedAt: null,
      status: "PUBLISHED",
    })
      .select("_id")
      .session(session)
      .lean();
    for (const lesson of lessons)
      await this.assertLessonTreePublishable(lesson._id, session);
  }

  private async assertLessonTreePublishable(
    lessonId: Types.ObjectId,
    session: mongoose.ClientSession,
  ) {
    const exercises = await Exercise.find({
      lessonId,
      deletedAt: null,
      status: "PUBLISHED",
    })
      .session(session)
      .lean();
    for (const exercise of exercises)
      await this.assertExercisePublishable(exercise._id, session);
  }

  private async assertExercisePublishable(
    exerciseId: Types.ObjectId,
    session: mongoose.ClientSession,
  ) {
    const exercise = await Exercise.findOne({
      _id: exerciseId,
      deletedAt: null,
    })
      .session(session)
      .lean();
    if (!exercise) return;
    assertExerciseCompatibility(exercise.exerciseType, exercise.completionMode);
    if (
      exercise.exerciseType === "QUIZ" &&
      !(await Quiz.exists({ exerciseId }).session(session))
    )
      throw new AppError(
        409,
        "QUIZ_DEFINITION_REQUIRED",
        "A quiz exercise cannot be published before its quiz definition exists.",
      );
  }

  private async getQuizExercise(
    exerciseId: string,
    session?: mongoose.ClientSession,
  ) {
    const oid = objectId(exerciseId);
    const query = Exercise.findOne({
      _id: oid,
      deletedAt: null,
      exerciseType: "QUIZ",
    });
    const exercise = session
      ? await query.session(session).lean()
      : await query.lean();
    if (!exercise) throw notFound("Quiz exercise not found.");
    const lesson = await Lesson.findOne({
      _id: exercise.lessonId,
      deletedAt: null,
    })
      .select("sectionId")
      .session(session ?? null)
      .lean();
    if (!lesson) throw notFound("Lesson not found.");
    const section = await CourseSection.findOne({
      _id: lesson.sectionId,
      deletedAt: null,
    })
      .select("courseId")
      .session(session ?? null)
      .lean();
    if (
      !section ||
      !(await Course.exists({ _id: section.courseId, deletedAt: null }).session(
        session ?? null,
      ))
    )
      throw notFound("Quiz parent not found.");
    return exercise;
  }

  private async linkAsset(
    kind: "lesson" | "exercise",
    parentIdRaw: string,
    assetIdRaw: string,
    input: AssociationWrite,
    actor: Actor,
  ) {
    const parentId = objectId(parentIdRaw);
    const mediaId = objectId(assetIdRaw);
    return withTransaction(async (session) => {
      const parent =
        kind === "lesson"
          ? await this.requireLiveLesson(parentId, session)
          : await this.requireLiveExercise(parentId, session);
      const asset = await MediaAsset.findOne({
        _id: mediaId,
        ...readyAssetFilter,
      })
        .session(session)
        .lean();
      if (!asset) throw notFound("Media asset not found.");
      if (!roleMatchesMediaType(input.assetRole, String(asset.mediaType), kind))
        throw new AppError(
          422,
          "INVALID_MEDIA_ASSOCIATION",
          "Asset role is not compatible with the asset media type.",
        );
      if (
        kind === "lesson" &&
        !["LECTURE_VIDEO", "LECTURE_PDF", "ATTACHMENT"].includes(
          input.assetRole,
        )
      )
        throw new AppError(
          422,
          "INVALID_MEDIA_ASSOCIATION",
          "This role is only valid for exercise assets.",
        );
      if (
        kind === "exercise" &&
        ![
          "QUESTION_PDF",
          "QUESTION_AUDIO",
          "ANSWER_PDF",
          "SOLUTION_VIDEO",
        ].includes(input.assetRole)
      )
        throw new AppError(
          422,
          "INVALID_MEDIA_ASSOCIATION",
          "This role is only valid for lesson assets.",
        );
      const exists =
        kind === "lesson"
          ? await LessonAsset.exists({
              lessonId: parentId,
              assetId: mediaId,
              assetRole: input.assetRole as
                "LECTURE_VIDEO" | "LECTURE_PDF" | "ATTACHMENT",
            }).session(session)
          : await ExerciseAsset.exists({
              exerciseId: parentId,
              assetId: mediaId,
              assetRole: input.assetRole as
                | "QUESTION_PDF"
                | "QUESTION_AUDIO"
                | "ANSWER_PDF"
                | "SOLUTION_VIDEO",
            }).session(session);
      const associationCount =
        kind === "lesson"
          ? await LessonAsset.countDocuments({ lessonId: parentId }).session(
              session,
            )
          : await ExerciseAsset.countDocuments({
              exerciseId: parentId,
            }).session(session);
      if (!exists && associationCount >= 100)
        throw new AppError(
          422,
          "ASSET_ASSOCIATION_LIMIT",
          "A lesson or exercise can have at most 100 media associations.",
        );
      const parentLock =
        kind === "lesson"
          ? await Lesson.updateOne(
              { _id: parentId, deletedAt: null },
              { $inc: { mediaAssociationRevision: 1 } },
              { session },
            )
          : await Exercise.updateOne(
              { _id: parentId, deletedAt: null },
              { $inc: { mediaAssociationRevision: 1 } },
              { session },
            );
      if (parentLock.matchedCount !== 1)
        throw notFound("Media association parent not found.");
      const lock = await MediaAsset.updateOne(
        { _id: mediaId, ...readyAssetFilter },
        { $inc: { referenceRevision: 1 } },
        { session },
      );
      if (lock.modifiedCount !== 1)
        throw conflict("Media asset is no longer available.");
      const update = {
        $set: { title: input.title ?? null, sortOrder: input.sortOrder },
      };
      const linked =
        kind === "lesson"
          ? await LessonAsset.findOneAndUpdate(
              {
                lessonId: parentId,
                assetId: mediaId,
                assetRole: input.assetRole as
                  "LECTURE_VIDEO" | "LECTURE_PDF" | "ATTACHMENT",
              },
              update,
              {
                upsert: true,
                returnDocument: "after",
                runValidators: true,
                session,
              },
            )
          : await ExerciseAsset.findOneAndUpdate(
              {
                exerciseId: parentId,
                assetId: mediaId,
                assetRole: input.assetRole as
                  | "QUESTION_PDF"
                  | "QUESTION_AUDIO"
                  | "ANSWER_PDF"
                  | "SOLUTION_VIDEO",
              },
              update,
              {
                upsert: true,
                returnDocument: "after",
                runValidators: true,
                session,
              },
            );
      await audit(
        actor,
        `${kind.toUpperCase()}_ASSET_LINKED`,
        kind === "lesson" ? "LESSON_ASSET" : "EXERCISE_ASSET",
        linked!._id,
        ["assetId", "assetRole", "title", "sortOrder"],
        session,
        {
          parentId: parent._id.toString(),
          assetId: mediaId.toString(),
          assetRole: input.assetRole,
        },
      );
      return this.populateSingleAssociation(
        linked!.toObject() as unknown as Doc,
        kind,
      );
    });
  }

  private async unlinkAsset(
    kind: "lesson" | "exercise",
    parentIdRaw: string,
    assetIdRaw: string,
    assetRole: string,
    actor: Actor,
  ) {
    const parentId = objectId(parentIdRaw);
    const assetId = objectId(assetIdRaw);
    return withTransaction(async (session) => {
      if (kind === "lesson") await this.requireLiveLesson(parentId, session);
      else await this.requireLiveExercise(parentId, session);
      const parentLock =
        kind === "lesson"
          ? await Lesson.updateOne(
              { _id: parentId, deletedAt: null },
              { $inc: { mediaAssociationRevision: 1 } },
              { session },
            )
          : await Exercise.updateOne(
              { _id: parentId, deletedAt: null },
              { $inc: { mediaAssociationRevision: 1 } },
              { session },
            );
      if (parentLock.matchedCount !== 1)
        throw notFound("Media association parent not found.");
      const rows =
        kind === "lesson"
          ? await LessonAsset.find({
              lessonId: parentId,
              assetId,
              assetRole: assetRole as
                "LECTURE_VIDEO" | "LECTURE_PDF" | "ATTACHMENT",
            }).session(session)
          : await ExerciseAsset.find({
              exerciseId: parentId,
              assetId,
              assetRole: assetRole as
                | "QUESTION_PDF"
                | "QUESTION_AUDIO"
                | "ANSWER_PDF"
                | "SOLUTION_VIDEO",
            }).session(session);
      if (!rows.length) throw notFound("Asset association not found.");
      if (kind === "lesson")
        await LessonAsset.deleteMany(
          {
            lessonId: parentId,
            assetId,
            assetRole: assetRole as
              "LECTURE_VIDEO" | "LECTURE_PDF" | "ATTACHMENT",
          },
          { session },
        );
      else
        await ExerciseAsset.deleteMany(
          {
            exerciseId: parentId,
            assetId,
            assetRole: assetRole as
              | "QUESTION_PDF"
              | "QUESTION_AUDIO"
              | "ANSWER_PDF"
              | "SOLUTION_VIDEO",
          },
          { session },
        );
      await MediaAsset.updateOne(
        { _id: assetId },
        { $inc: { referenceRevision: 1 } },
        { session },
      );
      const entityId = rows[0]!._id;
      await audit(
        actor,
        `${kind.toUpperCase()}_ASSET_UNLINKED`,
        kind === "lesson" ? "LESSON_ASSET" : "EXERCISE_ASSET",
        entityId,
        ["deleted"],
        session,
        { parentId: parentId.toString(), assetId: assetId.toString() },
      );
      return {
        parentId: parentId.toString(),
        assetId: assetId.toString(),
        assetRole,
        detached: true,
      };
    });
  }

  private async requireLiveLesson(
    lessonId: Types.ObjectId,
    session?: mongoose.ClientSession,
  ) {
    const query = Lesson.findOne({ _id: lessonId, deletedAt: null });
    const lesson = session ? await query.session(session) : await query;
    if (!lesson) throw notFound("Lesson not found.");
    const sectionQuery = CourseSection.findOne({
      _id: lesson.get("sectionId"),
      deletedAt: null,
    });
    const section = session
      ? await sectionQuery.session(session)
      : await sectionQuery;
    if (!section) throw notFound("Lesson parent not found.");
    const courseQuery = Course.findOne({
      _id: section.get("courseId"),
      deletedAt: null,
    }).select("_id");
    const course = session
      ? await courseQuery.session(session)
      : await courseQuery;
    if (!course) throw notFound("Course not found.");
    return lesson;
  }

  private async requireLiveExercise(
    exerciseId: Types.ObjectId,
    session?: mongoose.ClientSession,
  ) {
    const query = Exercise.findOne({ _id: exerciseId, deletedAt: null });
    const exercise = session ? await query.session(session) : await query;
    if (!exercise) throw notFound("Exercise not found.");
    const lesson = await this.requireLiveLesson(
      exercise.get("lessonId"),
      session,
    );
    return {
      ...exercise.toObject(),
      lessonId: lesson._id,
    } as unknown as typeof exercise;
  }

  private async populateAssociationAssets(
    rows: Doc[],
    kind: "lesson" | "exercise",
  ) {
    return Promise.all(
      rows.map((row) => this.populateSingleAssociation(row, kind)),
    );
  }

  private async populateSingleAssociation(
    row: Doc,
    kind: "lesson" | "exercise",
  ) {
    const media = await MediaAsset.findOne({
      _id: row.assetId,
      ...readyAssetFilter,
    }).lean();
    if (!media) throw notFound("Associated media asset is unavailable.");
    return {
      id: id(row._id),
      [kind === "lesson" ? "lessonId" : "exerciseId"]: id(
        kind === "lesson" ? row.lessonId : row.exerciseId,
      ),
      assetId: id(row.assetId),
      assetRole: String(row.assetRole),
      title: row.title ?? media.originalName,
      sortOrder: Number(row.sortOrder),
      media: mediaDto(media as unknown as Doc),
    };
  }

  private async enrollmentSummaries(rows: Doc[]) {
    const userIds = [...new Set(rows.map((row) => String(row.userId)))].map(
      (value) => new Types.ObjectId(value),
    );
    const courseIds = [...new Set(rows.map((row) => String(row.courseId)))].map(
      (value) => new Types.ObjectId(value),
    );
    const [users, courses, orders] = await Promise.all([
      User.find({ _id: { $in: userIds } })
        .select("fullName email status")
        .lean(),
      Course.find({ _id: { $in: courseIds } })
        .select("title code slug")
        .lean(),
      Order.find({
        _id: { $in: rows.map((row) => row.sourceOrderId).filter(Boolean) },
      })
        .select("_id orderCode status totalAmount createdAt")
        .lean(),
    ]);
    const userById = new Map(users.map((user) => [user._id.toString(), user]));
    const courseById = new Map(
      courses.map((course) => [course._id.toString(), course]),
    );
    const orderById = new Map(
      orders.map((order) => [order._id.toString(), order]),
    );
    return rows.map((row) => {
      const user = userById.get(String(row.userId));
      const course = courseById.get(String(row.courseId));
      const order = row.sourceOrderId
        ? orderById.get(String(row.sourceOrderId))
        : undefined;
      return {
        id: String(row._id),
        student: user
          ? {
              id: user._id.toString(),
              fullName: user.fullName,
              email: user.email,
              status: user.status,
            }
          : null,
        course: course
          ? {
              id: course._id.toString(),
              code: course.code,
              slug: course.slug,
              title: course.title,
            }
          : null,
        status:
          row.status === "ACTIVE" &&
          row.expiresAt instanceof Date &&
          row.expiresAt.getTime() <= this.now().getTime()
            ? "EXPIRED"
            : row.status,
        activatedAt: iso(row.activatedAt),
        expiresAt: iso(row.expiresAt),
        sourceOrder: order
          ? {
              id: order._id.toString(),
              orderCode: order.orderCode,
              status: order.status,
              totalAmount: decimal(order.totalAmount),
              createdAt: iso(order.createdAt),
            }
          : null,
        createdAt: iso(row.createdAt),
      };
    });
  }
}

function pageResult<T>(
  items: T[],
  query: { page: number; pageSize: number },
  total: number,
): Page<T> {
  return {
    items,
    page: query.page,
    pageSize: query.pageSize,
    total,
    hasMore: query.page * query.pageSize < total,
  };
}

function objectId(value: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) throw notFound();
  return new Types.ObjectId(value);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mapDuplicate(error: unknown, message: string): void {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  )
    throw conflict(message);
}

function isDuplicateKeyError(
  error: unknown,
): error is { code: number; message?: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function assertExerciseCompatibility(type: string, mode: string): void {
  if (!(
    (type === "FILE_BASED" && mode === "MANUAL") ||
    (type === "QUIZ" && mode === "QUIZ_SUBMISSION")
  ))
    throw new AppError(
      400,
      "INVALID_EXERCISE_CONFIGURATION",
      "FILE_BASED requires MANUAL; QUIZ requires QUIZ_SUBMISSION.",
    );
}

function validateQuizInput(input: QuizWrite): void {
  const questionSort = input.questions.map((question) => question.sortOrder);
  if (new Set(questionSort).size !== questionSort.length)
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Question sort orders must be unique.",
    );
  let totalCents = 0n;
  for (const question of input.questions) {
    if (
      new Set(question.options.map((option) => option.sortOrder)).size !==
      question.options.length
    )
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Option sort orders must be unique within each question.",
      );
    const parts = question.points.split(".");
    const cents =
      BigInt(parts[0]!) * 100n + BigInt((parts[1] ?? "").padEnd(2, "0") || "0");
    if (cents <= 0n)
      throw new AppError(
        400,
        "INVALID_QUIZ_POINTS",
        "Question points must be greater than zero.",
      );
    totalCents += cents;
  }
  if (totalCents <= 0n)
    throw new AppError(
      400,
      "INVALID_QUIZ_POINTS",
      "Quiz total points must be greater than zero.",
    );
}

function roleMatchesMediaType(
  role: string,
  type: string,
  kind: "lesson" | "exercise",
): boolean {
  if (kind === "lesson") {
    if (role === "LECTURE_VIDEO") return type === "VIDEO";
    if (role === "LECTURE_PDF") return type === "PDF";
    return (
      role === "ATTACHMENT" && ["IMAGE", "VIDEO", "AUDIO", "PDF"].includes(type)
    );
  }
  if (role === "QUESTION_PDF" || role === "ANSWER_PDF") return type === "PDF";
  if (role === "QUESTION_AUDIO") return type === "AUDIO";
  return role === "SOLUTION_VIDEO" && type === "VIDEO";
}

async function audit(
  actor: AuditActor,
  action: string,
  entityType: string,
  entityId: unknown,
  changedFields: string[],
  session: mongoose.ClientSession,
  state?: Doc,
): Promise<void> {
  await AuditLog.create(
    [
      {
        actorUserId: actor.userId ? objectId(actor.userId) : null,
        action,
        entityType,
        entityId:
          entityId instanceof Types.ObjectId ? entityId : String(entityId),
        oldValue: null,
        newValue: {
          changedFields,
          ...("source" in actor ? { source: actor.source } : {}),
          ...(state ?? {}),
        },
        ipAddress: actor.ipAddress,
      },
    ],
    { session },
  );
}

function userDto(user: Doc) {
  return {
    id: id(user._id),
    fullName: String(user.fullName),
    email: String(user.email),
    phone: user.phone ?? null,
    avatarAssetId: id(user.avatarAssetId),
    role: String(user.role),
    status: String(user.status),
    emailVerifiedAt: iso(user.emailVerifiedAt),
    createdAt: iso(user.createdAt),
    updatedAt: iso(user.updatedAt),
  };
}

function enrollmentDto(row: Doc, courseTitle: string, now: Date) {
  return {
    id: id(row._id),
    courseId: id(row.courseId),
    courseTitle,
    status:
      row.status === "ACTIVE" &&
      row.expiresAt instanceof Date &&
      row.expiresAt.getTime() <= now.getTime()
        ? "EXPIRED"
        : row.status,
    activatedAt: iso(row.activatedAt),
    expiresAt: iso(row.expiresAt),
    sourceOrderId: id(row.sourceOrderId),
  };
}

function orderSummary(row: Doc) {
  return {
    id: id(row._id),
    orderCode: String(row.orderCode),
    orderType: String(row.orderType),
    status: String(row.status),
    courseId: id(row.courseId),
    courseTitle: String(row.courseTitleSnapshot),
    totalAmount: decimal(row.totalAmount),
    durationMonths: Number(row.durationMonthsSnapshot),
    paymentSubmittedAt: iso(row.paymentSubmittedAt),
    paidAt: iso(row.paidAt),
    createdAt: iso(row.createdAt),
  };
}

function decimal(value: unknown): string {
  if (value instanceof mongoose.Types.Decimal128) return value.toString();
  return value === null || value === undefined ? "0" : String(value);
}

function renewalPlanDto(row: Doc) {
  return {
    id: id(row._id),
    courseId: id(row.courseId),
    title: String(row.title),
    durationMonths: Number(row.durationMonths),
    price: decimal(row.price),
    currency: "VND",
    status: String(row.status),
    sortOrder: Number(row.sortOrder ?? 0),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

function couponDto(row: Doc) {
  return {
    id: id(row._id),
    code: String(row.code),
    discountType: String(row.discountType),
    discountValue: decimal(row.discountValue),
    maxDiscount: row.maxDiscount == null ? null : decimal(row.maxDiscount),
    usageLimit: row.usageLimit == null ? null : Number(row.usageLimit),
    reservedCount: Number(row.reservedCount ?? 0),
    redemptionCount: Number(row.redemptionCount ?? 0),
    startsAt: iso(row.startsAt),
    expiresAt: iso(row.expiresAt),
    status: String(row.status),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

function assertCouponWrite(
  code: string,
  discountType: string,
  discountValue: string,
  startsAt: string | null | undefined,
  expiresAt: string | null | undefined,
) {
  if (!/^[A-Z0-9][A-Z0-9_-]{0,79}$/.test(code))
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Coupon code format is invalid.",
    );
  if (discountType === "PERCENT") {
    const percent = Number(discountValue);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100)
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Percentage discount must be between 0 and 100.",
      );
  } else if (discountType === "FIXED") {
    if (!/^(0|[1-9]\d*)$/.test(discountValue))
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Fixed discount must be a whole VND amount.",
      );
  } else {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Coupon discount type is invalid.",
    );
  }
  if (
    startsAt &&
    expiresAt &&
    new Date(startsAt).getTime() >= new Date(expiresAt).getTime()
  )
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Coupon expiry must be after its start date.",
    );
}

function manualEnrollmentFingerprint(action: string, input: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify({ action, input }))
    .digest("hex");
}

function assertManualFingerprint(existing: unknown, fingerprint: string) {
  if (existing !== fingerprint)
    throw new AppError(
      409,
      "IDEMPOTENCY_KEY_REUSED",
      "This Idempotency-Key was already used for a different enrollment action.",
    );
}

async function queueStudentEmail(
  session: mongoose.ClientSession,
  userId: Types.ObjectId,
  recipientEmail: string,
  templateType:
    | "RENEWAL_APPROVED_STUDENT"
    | "ORDER_CANCELLED_STUDENT"
    | "ENROLLMENT_GRANTED_STUDENT"
    | "ENROLLMENT_REVOKED_STUDENT"
    | "ENROLLMENT_RESTORED_STUDENT"
    | "ENROLLMENT_EXTENDED_STUDENT",
  subject: string,
  templateData: Record<string, unknown>,
  dedupeKey: string,
  availableAt: Date,
) {
  await EmailLog.create(
    [
      {
        userId,
        recipientType: "STUDENT",
        recipientEmail,
        templateType,
        subject,
        templateData,
        status: "PENDING",
        dedupeKey,
        attempts: 0,
        providerMessageId: null,
        sentAt: null,
        errorMessage: null,
        availableAt,
        leaseExpiresAt: null,
        leaseToken: null,
        lastErrorCode: null,
      },
    ],
    { session },
  );
}

function mediaUnavailable(
  message = "Media storage is not configured.",
): AppError {
  return new AppError(503, "MEDIA_STORAGE_UNAVAILABLE", message);
}

function safeOriginalName(value: string): string {
  const name = value.replaceAll("\\", "/").split("/").at(-1) ?? "upload";
  const safe = name
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 255);
  return safe || "upload";
}

function safeEntityId(value: unknown): string {
  if (value instanceof Types.ObjectId) return value.toString();
  if (typeof value === "string") return value.slice(0, 100);
  return "redacted";
}

function resolveMediaStorage(
  storage: MediaStorageAdapter,
  providerValue: unknown,
): MediaStorageAdapter | undefined {
  if (providerValue !== "S3_COMPATIBLE" && providerValue !== "CLOUDINARY")
    return undefined;
  const provider = providerValue as MediaProvider;
  const resolved = storage.resolve?.(provider);
  if (resolved) return resolved;
  if (!storage.resolve && (!storage.provider || storage.provider === provider))
    return storage;
  return undefined;
}

function cloudinaryResourceType(
  provider: MediaProvider,
  mediaType: string,
): MediaResourceType | null {
  if (provider !== "CLOUDINARY") return null;
  if (mediaType === "PDF") return "image";
  if (mediaType === "AUDIO") return "video";
  return null;
}

async function countMediaReferences(
  assetIds: Types.ObjectId[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (assetIds.length === 0) return counts;

  type CountRow = { _id: unknown; count: number };
  const collect = async (
    aggregate: (pipeline: mongoose.PipelineStage[]) => Promise<unknown[]>,
    fields: string[],
  ): Promise<CountRow[]> => {
    const pipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          $or: fields.map((field) => ({ [field]: { $in: assetIds } })),
        },
      },
      { $project: { references: fields.map((field) => `$${field}`) } },
      { $unwind: "$references" },
      { $match: { references: { $in: assetIds } } },
      { $group: { _id: "$references", count: { $sum: 1 } } },
    ];
    return (await aggregate(pipeline)) as CountRow[];
  };
  const groups = await Promise.all([
    collect(
      (pipeline) => Course.aggregate(pipeline).exec(),
      ["thumbnailAssetId", "bannerAssetId", "introVideoAssetId"],
    ),
    collect((pipeline) => User.aggregate(pipeline).exec(), ["avatarAssetId"]),
    collect(
      (pipeline) => SiteSettings.aggregate(pipeline).exec(),
      ["logoAssetId", "heroAssetId"],
    ),
    collect((pipeline) => LessonAsset.aggregate(pipeline).exec(), ["assetId"]),
    collect(
      (pipeline) => ExerciseAsset.aggregate(pipeline).exec(),
      ["assetId"],
    ),
  ]);
  for (const row of groups.flat()) {
    const assetId = id(row._id);
    if (assetId) counts.set(assetId, (counts.get(assetId) ?? 0) + row.count);
  }
  return counts;
}
