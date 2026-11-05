import {
  Router,
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import type { AppConfig } from "../../config/env.js";
import { validateRequest } from "../../http/validation.js";
import { AppError, unauthorized } from "../../shared/errors.js";
import { success } from "../../shared/responses.js";
import { authenticate, requireRole } from "../auth/middleware.js";
import type { Actor } from "./service.js";
import { AdminService } from "./service.js";
import {
  assetIdParamsSchema,
  associationWriteSchema,
  couponCreateSchema,
  couponIdParamsSchema,
  couponListQuerySchema,
  couponPatchSchema,
  associationDeleteQuerySchema,
  auditListQuerySchema,
  courseIdParamsSchema,
  courseListQuerySchema,
  coursePatchSchema,
  createCourseSchema,
  createExerciseSchema,
  createLessonSchema,
  createSectionSchema,
  enrollmentIdParamsSchema,
  enrollmentExtendSchema,
  enrollmentGrantSchema,
  enrollmentListQuerySchema,
  enrollmentReasonSchema,
  enrollmentRestoreSchema,
  exerciseIdParamsSchema,
  exerciseListQuerySchema,
  exercisePatchSchema,
  lessonIdParamsSchema,
  lessonListQuerySchema,
  lessonPatchSchema,
  mediaListQuerySchema,
  lessonAssetParamsSchema,
  exerciseAssetParamsSchema,
  quizWriteSchema,
  renewalPlanCreateSchema,
  renewalPlanIdParamsSchema,
  renewalPlanListQuerySchema,
  renewalPlanPatchSchema,
  sectionIdParamsSchema,
  sectionListQuerySchema,
  sectionPatchSchema,
  studentListQuerySchema,
  studentStatusSchema,
  uploadCompleteSchema,
  uploadIntentSchema,
  userIdParamsSchema,
} from "./schemas.js";

type ValidatedKey = "params" | "query" | "body";

export function createAdminRouter(
  config: AppConfig,
  admin: AdminService,
): Router {
  const router = Router();
  router.use("/admin", authenticate(config), requireRole("ADMIN"));

  router.get(
    "/admin/courses",
    validateRequest({ query: courseListQuerySchema }),
    endpoint((_, res) => admin.listCourses(value(res, "query"))),
  );
  router.post(
    "/admin/courses",
    validateRequest({ body: createCourseSchema }),
    endpoint(
      (req, res) => admin.createCourse(value(res, "body"), actor(req)),
      201,
    ),
  );
  router.get(
    "/admin/courses/:courseId",
    validateRequest({ params: courseIdParamsSchema }),
    endpoint((_, res) => admin.getCourse(param(res, "courseId"))),
  );
  router.patch(
    "/admin/courses/:courseId",
    validateRequest({ params: courseIdParamsSchema, body: coursePatchSchema }),
    endpoint((req, res) =>
      admin.updateCourse(
        param(res, "courseId"),
        value(res, "body"),
        actor(req),
      ),
    ),
  );
  router.delete(
    "/admin/courses/:courseId",
    validateRequest({ params: courseIdParamsSchema }),
    endpoint((req, res) =>
      admin.deleteCourse(param(res, "courseId"), actor(req)),
    ),
  );
  router.post(
    "/admin/courses/:courseId/publish",
    validateRequest({ params: courseIdParamsSchema }),
    endpoint((req, res) =>
      admin.publishCourse(param(res, "courseId"), actor(req)),
    ),
  );
  router.get(
    "/admin/courses/:courseId/sections",
    validateRequest({
      params: courseIdParamsSchema,
      query: sectionListQuerySchema,
    }),
    endpoint((_, res) =>
      admin.listSections(param(res, "courseId"), value(res, "query")),
    ),
  );
  router.post(
    "/admin/courses/:courseId/sections",
    validateRequest({
      params: courseIdParamsSchema,
      body: createSectionSchema,
    }),
    endpoint(
      (req, res) =>
        admin.createSection(
          param(res, "courseId"),
          value(res, "body"),
          actor(req),
        ),
      201,
    ),
  );

  router.patch(
    "/admin/sections/:sectionId",
    validateRequest({
      params: sectionIdParamsSchema,
      body: sectionPatchSchema,
    }),
    endpoint((req, res) =>
      admin.updateSection(
        param(res, "sectionId"),
        value(res, "body"),
        actor(req),
      ),
    ),
  );
  router.delete(
    "/admin/sections/:sectionId",
    validateRequest({ params: sectionIdParamsSchema }),
    endpoint((req, res) =>
      admin.deleteSection(param(res, "sectionId"), actor(req)),
    ),
  );
  router.get(
    "/admin/sections/:sectionId/lessons",
    validateRequest({
      params: sectionIdParamsSchema,
      query: lessonListQuerySchema,
    }),
    endpoint((_, res) =>
      admin.listLessons(param(res, "sectionId"), value(res, "query")),
    ),
  );
  router.post(
    "/admin/sections/:sectionId/lessons",
    validateRequest({
      params: sectionIdParamsSchema,
      body: createLessonSchema,
    }),
    endpoint(
      (req, res) =>
        admin.createLesson(
          param(res, "sectionId"),
          value(res, "body"),
          actor(req),
        ),
      201,
    ),
  );

  router.patch(
    "/admin/lessons/:lessonId",
    validateRequest({ params: lessonIdParamsSchema, body: lessonPatchSchema }),
    endpoint((req, res) =>
      admin.updateLesson(
        param(res, "lessonId"),
        value(res, "body"),
        actor(req),
      ),
    ),
  );
  router.delete(
    "/admin/lessons/:lessonId",
    validateRequest({ params: lessonIdParamsSchema }),
    endpoint((req, res) =>
      admin.deleteLesson(param(res, "lessonId"), actor(req)),
    ),
  );
  router.get(
    "/admin/lessons/:lessonId/exercises",
    validateRequest({
      params: lessonIdParamsSchema,
      query: exerciseListQuerySchema,
    }),
    endpoint((_, res) =>
      admin.listExercises(param(res, "lessonId"), value(res, "query")),
    ),
  );
  router.post(
    "/admin/lessons/:lessonId/exercises",
    validateRequest({
      params: lessonIdParamsSchema,
      body: createExerciseSchema,
    }),
    endpoint(
      (req, res) =>
        admin.createExercise(
          param(res, "lessonId"),
          value(res, "body"),
          actor(req),
        ),
      201,
    ),
  );

  router.patch(
    "/admin/exercises/:exerciseId",
    validateRequest({
      params: exerciseIdParamsSchema,
      body: exercisePatchSchema,
    }),
    endpoint((req, res) =>
      admin.updateExercise(
        param(res, "exerciseId"),
        value(res, "body"),
        actor(req),
      ),
    ),
  );
  router.delete(
    "/admin/exercises/:exerciseId",
    validateRequest({ params: exerciseIdParamsSchema }),
    endpoint((req, res) =>
      admin.deleteExercise(param(res, "exerciseId"), actor(req)),
    ),
  );
  router.get(
    "/admin/exercises/:exerciseId/quiz",
    validateRequest({ params: exerciseIdParamsSchema }),
    endpoint((_, res) => admin.getQuiz(param(res, "exerciseId"))),
  );
  router.put(
    "/admin/exercises/:exerciseId/quiz",
    validateRequest({ params: exerciseIdParamsSchema, body: quizWriteSchema }),
    endpoint((req, res) =>
      admin.replaceQuiz(
        param(res, "exerciseId"),
        value(res, "body"),
        actor(req),
      ),
    ),
  );

  router.get(
    "/admin/media-assets/capabilities",
    endpoint((_, _res) => admin.getMediaCapabilities()),
  );
  router.get(
    "/admin/media-assets",
    validateRequest({ query: mediaListQuerySchema }),
    endpoint((_, res) => admin.listMedia(value(res, "query"))),
  );
  router.get(
    "/admin/media-assets/:assetId",
    validateRequest({ params: assetIdParamsSchema }),
    endpoint((_, res) => admin.getMediaAssetDetail(param(res, "assetId"))),
  );
  router.post(
    "/admin/media-assets/:assetId/preview-access",
    validateRequest({ params: assetIdParamsSchema }),
    endpoint((_, res) => {
      res.setHeader("Cache-Control", "private, no-store");
      return admin.createMediaPreviewAccess(param(res, "assetId"));
    }),
  );
  router.post(
    "/admin/media-assets/upload-intents",
    validateRequest({ body: uploadIntentSchema }),
    endpoint(
      (req, res) =>
        admin.createMediaUploadIntent(value(res, "body"), actor(req)),
      201,
    ),
  );
  router.post(
    "/admin/media-assets/:assetId/complete-upload",
    validateRequest({
      params: assetIdParamsSchema,
      body: uploadCompleteSchema,
    }),
    endpoint((req, res) =>
      admin.completeMediaUpload(
        param(res, "assetId"),
        value(res, "body"),
        actor(req),
      ),
    ),
  );
  router.delete(
    "/admin/media-assets/:assetId",
    validateRequest({ params: assetIdParamsSchema }),
    endpoint((req, res) =>
      admin.deleteMediaAsset(param(res, "assetId"), actor(req)),
    ),
  );

  router.get(
    "/admin/students",
    validateRequest({ query: studentListQuerySchema }),
    endpoint((_, res) => admin.listStudents(value(res, "query"))),
  );
  router.get(
    "/admin/students/:userId",
    validateRequest({ params: userIdParamsSchema }),
    endpoint((_, res) => admin.getStudent(param(res, "userId"))),
  );
  router.patch(
    "/admin/students/:userId/status",
    validateRequest({ params: userIdParamsSchema, body: studentStatusSchema }),
    endpoint((req, res) =>
      admin.setStudentStatus(
        param(res, "userId"),
        value(res, "body"),
        actor(req),
      ),
    ),
  );
  router.get(
    "/admin/enrollments",
    validateRequest({ query: enrollmentListQuerySchema }),
    endpoint((_, res) => admin.listEnrollments(value(res, "query"))),
  );
  router.post(
    "/admin/enrollments",
    validateRequest({ body: enrollmentGrantSchema }),
    endpoint(
      (req, res) =>
        admin.grantEnrollment(
          value(res, "body"),
          actor(req),
          requiredIdempotencyKey(req),
        ),
      201,
    ),
  );
  router.get(
    "/admin/enrollments/:enrollmentId",
    validateRequest({ params: enrollmentIdParamsSchema }),
    endpoint((_, res) => admin.getEnrollment(param(res, "enrollmentId"))),
  );
  router.post(
    "/admin/enrollments/:enrollmentId/revoke",
    validateRequest({
      params: enrollmentIdParamsSchema,
      body: enrollmentReasonSchema,
    }),
    endpoint((req, res) =>
      admin.revokeEnrollment(
        param(res, "enrollmentId"),
        value(res, "body"),
        actor(req),
        requiredIdempotencyKey(req),
      ),
    ),
  );
  router.post(
    "/admin/enrollments/:enrollmentId/restore",
    validateRequest({
      params: enrollmentIdParamsSchema,
      body: enrollmentRestoreSchema,
    }),
    endpoint((req, res) =>
      admin.restoreEnrollment(
        param(res, "enrollmentId"),
        value(res, "body"),
        actor(req),
        requiredIdempotencyKey(req),
      ),
    ),
  );
  router.post(
    "/admin/enrollments/:enrollmentId/extend",
    validateRequest({
      params: enrollmentIdParamsSchema,
      body: enrollmentExtendSchema,
    }),
    endpoint((req, res) =>
      admin.extendEnrollment(
        param(res, "enrollmentId"),
        value(res, "body"),
        actor(req),
        requiredIdempotencyKey(req),
      ),
    ),
  );
  router.get(
    "/admin/courses/:courseId/renewal-plans",
    validateRequest({
      params: courseIdParamsSchema,
      query: renewalPlanListQuerySchema,
    }),
    endpoint((_, res) =>
      admin.listRenewalPlans(param(res, "courseId"), value(res, "query")),
    ),
  );
  router.post(
    "/admin/courses/:courseId/renewal-plans",
    validateRequest({
      params: courseIdParamsSchema,
      body: renewalPlanCreateSchema,
    }),
    endpoint(
      (req, res) =>
        admin.createRenewalPlan(
          param(res, "courseId"),
          value(res, "body"),
          actor(req),
        ),
      201,
    ),
  );
  router.patch(
    "/admin/renewal-plans/:planId",
    validateRequest({
      params: renewalPlanIdParamsSchema,
      body: renewalPlanPatchSchema,
    }),
    endpoint((req, res) =>
      admin.updateRenewalPlan(
        param(res, "planId"),
        value(res, "body"),
        actor(req),
      ),
    ),
  );
  router.delete(
    "/admin/renewal-plans/:planId",
    validateRequest({ params: renewalPlanIdParamsSchema }),
    endpoint((req, res) =>
      admin.deactivateRenewalPlan(param(res, "planId"), actor(req)),
    ),
  );
  router.get(
    "/admin/coupons",
    validateRequest({ query: couponListQuerySchema }),
    endpoint((_, res) => admin.listCoupons(value(res, "query"))),
  );
  router.post(
    "/admin/coupons",
    validateRequest({ body: couponCreateSchema }),
    endpoint(
      (req, res) => admin.createCoupon(value(res, "body"), actor(req)),
      201,
    ),
  );
  router.patch(
    "/admin/coupons/:couponId",
    validateRequest({ params: couponIdParamsSchema, body: couponPatchSchema }),
    endpoint((req, res) =>
      admin.updateCoupon(
        param(res, "couponId"),
        value(res, "body"),
        actor(req),
      ),
    ),
  );
  router.delete(
    "/admin/coupons/:couponId",
    validateRequest({ params: couponIdParamsSchema }),
    endpoint((req, res) =>
      admin.deactivateCoupon(param(res, "couponId"), actor(req)),
    ),
  );
  router.get(
    "/admin/audit-logs",
    validateRequest({ query: auditListQuerySchema }),
    endpoint((_, res) => admin.listAuditLogs(value(res, "query"))),
  );

  // BE-03B contract extensions: media library search and exact asset associations.
  router.get(
    "/admin/lessons/:lessonId/assets",
    validateRequest({ params: lessonIdParamsSchema }),
    endpoint((_, res) => admin.listLessonAssets(param(res, "lessonId"))),
  );
  router.put(
    "/admin/lessons/:lessonId/assets/:assetId",
    validateRequest({
      params: lessonAssetParamsSchema,
      body: associationWriteSchema,
    }),
    endpoint((req, res) =>
      admin.linkLessonAsset(
        param(res, "lessonId"),
        param(res, "assetId"),
        value(res, "body"),
        actor(req),
      ),
    ),
  );
  router.delete(
    "/admin/lessons/:lessonId/assets/:assetId",
    validateRequest({
      params: lessonAssetParamsSchema,
      query: associationDeleteQuerySchema,
    }),
    endpoint((req, res) =>
      admin.unlinkLessonAsset(
        param(res, "lessonId"),
        param(res, "assetId"),
        value(res, "query").assetRole as string,
        actor(req),
      ),
    ),
  );
  router.get(
    "/admin/exercises/:exerciseId/assets",
    validateRequest({ params: exerciseIdParamsSchema }),
    endpoint((_, res) => admin.listExerciseAssets(param(res, "exerciseId"))),
  );
  router.put(
    "/admin/exercises/:exerciseId/assets/:assetId",
    validateRequest({
      params: exerciseAssetParamsSchema,
      body: associationWriteSchema,
    }),
    endpoint((req, res) =>
      admin.linkExerciseAsset(
        param(res, "exerciseId"),
        param(res, "assetId"),
        value(res, "body"),
        actor(req),
      ),
    ),
  );
  router.delete(
    "/admin/exercises/:exerciseId/assets/:assetId",
    validateRequest({
      params: exerciseAssetParamsSchema,
      query: associationDeleteQuerySchema,
    }),
    endpoint((req, res) =>
      admin.unlinkExerciseAsset(
        param(res, "exerciseId"),
        param(res, "assetId"),
        value(res, "query").assetRole as string,
        actor(req),
      ),
    ),
  );

  return router;
}

function endpoint(
  operation: (req: Request, res: Response) => Promise<unknown>,
  statusCode = 200,
): RequestHandler {
  return async (req, res, next) => {
    try {
      success(res, await operation(req, res), statusCode);
    } catch (error) {
      next(error);
    }
  };
}

function actor(req: Request): Actor {
  if (!req.auth) throw unauthorized();
  return { userId: req.auth.sub, ipAddress: req.ip ?? null };
}

function requiredIdempotencyKey(req: Request): string {
  const value = req.header("idempotency-key");
  if (!value || value.length < 8 || value.length > 128)
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Idempotency-Key must contain 8 to 128 characters.",
    );
  return value;
}

function param(res: Response, name: string): string {
  return (res.locals.validated.params as Record<string, string>)[name]!;
}

function value<T extends Record<string, unknown>>(
  res: Response,
  key: ValidatedKey,
): T {
  return res.locals.validated[key] as T;
}
