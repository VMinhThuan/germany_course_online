import { Router } from "express";
import type { AppConfig } from "../../config/env.js";
import { authenticate, requireRole } from "../auth/middleware.js";
import { validateRequest } from "../../http/validation.js";
import { success } from "../../shared/responses.js";
import { LessonCommentService } from "./service.js";
import {
  adminListCommentsQuery,
  commentParams,
  createCommentBody,
  deleteCommentBody,
  editCommentBody,
  lessonParams,
  listCommentsQuery,
  reactionBody,
  repliesQuery,
} from "./schemas.js";

export function createLessonCommentRouter(
  config: AppConfig,
  comments: LessonCommentService,
): Router {
  const router = Router();
  router.use("/learn", authenticate(config), requireRole("STUDENT"));
  router.use(
    "/admin/lesson-comments",
    authenticate(config),
    requireRole("ADMIN"),
  );
  router.use("/admin/lessons", authenticate(config), requireRole("ADMIN"));

  router.get(
    "/learn/lessons/:lessonId/comments",
    validateRequest({ params: lessonParams, query: listCommentsQuery }),
    async (req, res) => {
      const { params, query } = res.locals.validated as {
        params: { lessonId: string };
        query: { limit: number; cursor?: string; sort: "newest" | "oldest" };
      };
      success(
        res,
        await comments.listStudentComments(
          req.auth!.sub,
          params.lessonId,
          query,
        ),
      );
    },
  );
  router.post(
    "/learn/lessons/:lessonId/comments",
    validateRequest({ params: lessonParams, body: createCommentBody }),
    async (_req, res) => {
      const { params, body } = res.locals.validated as {
        params: { lessonId: string };
        body: {
          content: string;
          isAnonymous: boolean;
          parentId: string | null;
        };
      };
      success(
        res,
        await comments.createStudentComment(
          res.req.auth!.sub,
          params.lessonId,
          body,
        ),
        201,
      );
    },
  );
  router.get(
    "/learn/comments/:commentId/replies",
    validateRequest({ params: commentParams, query: repliesQuery }),
    async (_req, res) => {
      const { params, query } = res.locals.validated as {
        params: { commentId: string };
        query: { limit: number; cursor?: string };
      };
      success(
        res,
        await comments.listStudentReplies(
          res.req.auth!.sub,
          params.commentId,
          query,
        ),
      );
    },
  );
  router.patch(
    "/learn/comments/:commentId",
    validateRequest({ params: commentParams, body: editCommentBody }),
    async (_req, res) => {
      const { params, body } = res.locals.validated as {
        params: { commentId: string };
        body: { content: string; expectedRevision: number };
      };
      success(
        res,
        await comments.editStudentComment(
          res.req.auth!.sub,
          params.commentId,
          body,
        ),
      );
    },
  );
  router.delete(
    "/learn/comments/:commentId",
    validateRequest({ params: commentParams }),
    async (_req, res) => {
      const { params } = res.locals.validated as {
        params: { commentId: string };
      };
      success(
        res,
        await comments.deleteStudentComment(
          res.req.auth!.sub,
          params.commentId,
        ),
      );
    },
  );
  router.put(
    "/learn/comments/:commentId/reaction",
    validateRequest({ params: commentParams, body: reactionBody }),
    async (_req, res) => {
      const { params, body } = res.locals.validated as {
        params: { commentId: string };
        body: { reactionType: "LIKE" | "LOVE" | "HAHA" | "WOW" | "CLAP" };
      };
      success(
        res,
        await comments.reactStudent(
          res.req.auth!.sub,
          params.commentId,
          body.reactionType,
        ),
      );
    },
  );
  router.delete(
    "/learn/comments/:commentId/reaction",
    validateRequest({ params: commentParams }),
    async (_req, res) => {
      const { params } = res.locals.validated as {
        params: { commentId: string };
      };
      success(
        res,
        await comments.removeStudentReaction(
          res.req.auth!.sub,
          params.commentId,
        ),
      );
    },
  );
  router.get(
    "/learn/comments/:commentId/history",
    validateRequest({ params: commentParams }),
    async (_req, res) => {
      const { params } = res.locals.validated as {
        params: { commentId: string };
      };
      success(
        res,
        await comments.studentHistory(res.req.auth!.sub, params.commentId),
      );
    },
  );

  router.get("/admin/lesson-comments/summary", async (_req, res) =>
    success(res, await comments.adminSummary()),
  );
  router.get(
    "/admin/lesson-comments",
    validateRequest({ query: adminListCommentsQuery }),
    async (_req, res) => {
      const { query } = res.locals.validated as {
        query: Parameters<LessonCommentService["listAdminComments"]>[0];
      };
      success(res, await comments.listAdminComments(query, res.req.auth!.sub));
    },
  );
  router.get(
    "/admin/lesson-comments/:commentId",
    validateRequest({ params: commentParams }),
    async (_req, res) => {
      const { params } = res.locals.validated as {
        params: { commentId: string };
      };
      success(
        res,
        await comments.getAdminComment(params.commentId, res.req.auth!.sub),
      );
    },
  );
  router.get(
    "/admin/lesson-comments/:commentId/history",
    validateRequest({ params: commentParams }),
    async (_req, res) => {
      const { params } = res.locals.validated as {
        params: { commentId: string };
      };
      success(res, await comments.adminHistory(params.commentId));
    },
  );
  router.post(
    "/admin/lessons/:lessonId/comments",
    validateRequest({ params: lessonParams, body: createCommentBody }),
    async (_req, res) => {
      const { params, body } = res.locals.validated as {
        params: { lessonId: string };
        body: {
          content: string;
          isAnonymous: boolean;
          parentId: string | null;
        };
      };
      success(
        res,
        await comments.createAdminComment(
          res.req.auth!.sub,
          params.lessonId,
          body,
        ),
        201,
      );
    },
  );
  router.patch(
    "/admin/lesson-comments/:commentId",
    validateRequest({ params: commentParams, body: editCommentBody }),
    async (_req, res) => {
      const { params, body } = res.locals.validated as {
        params: { commentId: string };
        body: { content: string; expectedRevision: number; reason?: string };
      };
      success(
        res,
        await comments.editAdminComment(
          res.req.auth!.sub,
          params.commentId,
          body,
        ),
      );
    },
  );
  router.delete(
    "/admin/lesson-comments/:commentId",
    validateRequest({ params: commentParams, body: deleteCommentBody }),
    async (_req, res) => {
      const { params, body } = res.locals.validated as {
        params: { commentId: string };
        body: { reason?: string };
      };
      success(
        res,
        await comments.deleteAdminComment(
          res.req.auth!.sub,
          params.commentId,
          body.reason,
        ),
      );
    },
  );
  router.put(
    "/admin/lesson-comments/:commentId/reaction",
    validateRequest({ params: commentParams, body: reactionBody }),
    async (_req, res) => {
      const { params, body } = res.locals.validated as {
        params: { commentId: string };
        body: { reactionType: "LIKE" | "LOVE" | "HAHA" | "WOW" | "CLAP" };
      };
      success(
        res,
        await comments.reactAdmin(
          res.req.auth!.sub,
          params.commentId,
          body.reactionType,
        ),
      );
    },
  );
  router.delete(
    "/admin/lesson-comments/:commentId/reaction",
    validateRequest({ params: commentParams }),
    async (_req, res) => {
      const { params } = res.locals.validated as {
        params: { commentId: string };
      };
      success(
        res,
        await comments.removeAdminReaction(res.req.auth!.sub, params.commentId),
      );
    },
  );
  return router;
}
