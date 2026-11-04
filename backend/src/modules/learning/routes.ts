import { Router } from "express";
import type { AppConfig } from "../../config/env.js";
import { authenticate, requireRole } from "../auth/middleware.js";
import { validateRequest } from "../../http/validation.js";
import { AppError } from "../../shared/errors.js";
import { success } from "../../shared/responses.js";
import type { LearningService } from "./service.js";
import type { QuizService } from "./quiz-service.js";
import type { MediaAccessService } from "./media-access-service.js";
import {
  answerParams,
  courseIdParams,
  exerciseParams,
  idempotencyKeySchema,
  lessonParams,
  mediaAccessBody,
  myCoursesQuery,
  saveLessonNoteBody,
  sectionParams,
  selectQuizAnswerBody,
  attemptParams,
} from "./schemas.js";

type LearningRouteDependencies = {
  learning: LearningService;
  quizzes: QuizService;
  media: MediaAccessService;
};

export function createLearningRouter(
  config: AppConfig,
  dependencies: LearningRouteDependencies,
): Router {
  const router = Router();
  const { learning, quizzes, media } = dependencies;
  router.use(["/me", "/learn"], authenticate(config), requireRole("STUDENT"));

  router.get("/me/dashboard", async (req, res) => {
    success(res, await learning.getDashboard(req.auth!.sub));
  });
  router.get(
    "/me/courses",
    validateRequest({ query: myCoursesQuery }),
    async (_req, res) => {
      const query = res.locals.validated as {
        query: {
          page: number;
          pageSize: number;
          status?: "ACTIVE" | "REVOKED";
        };
      };
      success(
        res,
        await learning.listMyCourses(res.req.auth!.sub, query.query),
      );
    },
  );
  router.get(
    "/me/courses/:courseId",
    validateRequest({ params: courseIdParams }),
    async (_req, res) => {
      const { params } = res.locals.validated as {
        params: { courseId: string };
      };
      success(
        res,
        await learning.getCourseOverview(res.req.auth!.sub, params.courseId),
      );
    },
  );
  router.get(
    "/learn/courses/:courseId/sections/:sectionId",
    validateRequest({ params: sectionParams }),
    async (_req, res) => {
      const { params } = res.locals.validated as {
        params: { courseId: string; sectionId: string };
      };
      success(
        res,
        await learning.getSection(
          res.req.auth!.sub,
          params.courseId,
          params.sectionId,
        ),
      );
    },
  );
  router.get(
    "/learn/lessons/:lessonId",
    validateRequest({ params: lessonParams }),
    async (_req, res) => {
      const { params } = res.locals.validated as {
        params: { lessonId: string };
      };
      success(
        res,
        await learning.getLessonWorkspace(res.req.auth!.sub, params.lessonId),
      );
    },
  );
  router.get(
    "/learn/exercises/:exerciseId",
    validateRequest({ params: exerciseParams }),
    async (_req, res) => {
      const { params } = res.locals.validated as {
        params: { exerciseId: string };
      };
      success(
        res,
        await learning.getExercise(res.req.auth!.sub, params.exerciseId),
      );
    },
  );
  router.post(
    "/learn/exercises/:exerciseId/complete",
    validateRequest({ params: exerciseParams }),
    async (_req, res) => {
      const { params } = res.locals.validated as {
        params: { exerciseId: string };
      };
      success(
        res,
        await learning.completeExercise(res.req.auth!.sub, params.exerciseId),
      );
    },
  );
  router.post(
    "/learn/lessons/:lessonId/complete",
    validateRequest({ params: lessonParams }),
    async (_req, res) => {
      const { params } = res.locals.validated as {
        params: { lessonId: string };
      };
      success(
        res,
        await learning.completeLesson(res.req.auth!.sub, params.lessonId),
      );
    },
  );
  router.get(
    "/learn/courses/:courseId/progress",
    validateRequest({ params: courseIdParams }),
    async (_req, res) => {
      const { params } = res.locals.validated as {
        params: { courseId: string };
      };
      success(
        res,
        await learning.getCourseProgress(res.req.auth!.sub, params.courseId),
      );
    },
  );
  router.get(
    "/learn/lessons/:lessonId/notes",
    validateRequest({ params: lessonParams }),
    async (_req, res) => {
      const { params } = res.locals.validated as {
        params: { lessonId: string };
      };
      success(
        res,
        await learning.getLessonNote(res.req.auth!.sub, params.lessonId),
      );
    },
  );
  router.put(
    "/learn/lessons/:lessonId/notes",
    validateRequest({ params: lessonParams, body: saveLessonNoteBody }),
    async (_req, res) => {
      const validated = res.locals.validated as {
        params: { lessonId: string };
        body: { content: string };
      };
      success(
        res,
        await learning.saveLessonNote(
          res.req.auth!.sub,
          validated.params.lessonId,
          validated.body.content,
        ),
      );
    },
  );
  router.post(
    "/learn/media-access",
    validateRequest({ body: mediaAccessBody }),
    async (_req, res) => {
      const { body } = res.locals.validated as {
        body: Parameters<MediaAccessService["requestAccess"]>[1];
      };
      success(res, await media.requestAccess(res.req.auth!.sub, body));
    },
  );
  router.post(
    "/learn/exercises/:exerciseId/quiz-attempts",
    validateRequest({ params: exerciseParams }),
    async (req, res) => {
      const { params } = res.locals.validated as {
        params: { exerciseId: string };
      };
      success(
        res,
        await quizzes.startAttempt(
          req.auth!.sub,
          params.exerciseId,
          idempotencyKey(req.header("idempotency-key")),
        ),
        201,
      );
    },
  );
  router.get(
    "/learn/quiz-attempts/:attemptId",
    validateRequest({ params: attemptParams }),
    async (_req, res) => {
      const { params } = res.locals.validated as {
        params: { attemptId: string };
      };
      success(
        res,
        await quizzes.getAttempt(res.req.auth!.sub, params.attemptId),
      );
    },
  );
  router.put(
    "/learn/quiz-attempts/:attemptId/answers/:questionId",
    validateRequest({ params: answerParams, body: selectQuizAnswerBody }),
    async (_req, res) => {
      const validated = res.locals.validated as {
        params: { attemptId: string; questionId: string };
        body: { selectedOptionId: string };
      };
      success(
        res,
        await quizzes.selectAnswer(
          res.req.auth!.sub,
          validated.params.attemptId,
          validated.params.questionId,
          validated.body.selectedOptionId,
        ),
      );
    },
  );
  router.post(
    "/learn/quiz-attempts/:attemptId/submit",
    validateRequest({ params: attemptParams }),
    async (_req, res) => {
      const { params } = res.locals.validated as {
        params: { attemptId: string };
      };
      success(
        res,
        await quizzes.submitAttempt(res.req.auth!.sub, params.attemptId),
      );
    },
  );
  router.get(
    "/learn/quiz-attempts/:attemptId/result",
    validateRequest({ params: attemptParams }),
    async (_req, res) => {
      const { params } = res.locals.validated as {
        params: { attemptId: string };
      };
      success(
        res,
        await quizzes.getResult(res.req.auth!.sub, params.attemptId),
      );
    },
  );
  router.post(
    "/learn/quiz-attempts/:attemptId/retry",
    validateRequest({ params: attemptParams }),
    async (req, res) => {
      const { params } = res.locals.validated as {
        params: { attemptId: string };
      };
      success(
        res,
        await quizzes.retryAttempt(
          req.auth!.sub,
          params.attemptId,
          idempotencyKey(req.header("idempotency-key")),
        ),
        201,
      );
    },
  );
  return router;
}

function idempotencyKey(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const parsed = idempotencyKeySchema.safeParse(value);
  if (!parsed.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Idempotency-Key is invalid.");
  }
  return parsed.data;
}
