import { Router } from "express";
import { success } from "../../shared/responses.js";
import { validateRequest } from "../../http/validation.js";
import { PublicCatalogService } from "./service.js";
import {
  courseListQuerySchema,
  courseSlugParamsSchema,
  mediaAssetParamsSchema,
} from "./schemas.js";
import { z } from "zod";

const previewLessonParamsSchema = z.strictObject({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  lessonId: z.string().regex(/^[a-fA-F0-9]{24}$/),
});
const previewLessonQuerySchema = z.strictObject({
  sectionId: z.string().regex(/^[a-fA-F0-9]{24}$/),
});

export function createPublicRouter(catalog: PublicCatalogService): Router {
  const router = Router();
  router.get(
    "/courses",
    validateRequest({ query: courseListQuerySchema }),
    async (_req, res, next) => {
      try {
        success(
          res,
          await catalog.listCourses(
            res.locals.validated.query as typeof courseListQuerySchema._output,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );
  router.get(
    "/courses/:slug",
    validateRequest({ params: courseSlugParamsSchema }),
    async (_req, res, next) => {
      try {
        const { slug } = res.locals.validated
          .params as typeof courseSlugParamsSchema._output;
        success(res, await catalog.getCourseBySlug(slug));
      } catch (error) {
        next(error);
      }
    },
  );
  router.get(
    "/courses/:slug/preview/lessons/:lessonId",
    validateRequest({
      params: previewLessonParamsSchema,
      query: previewLessonQuerySchema,
    }),
    async (_req, res, next) => {
      try {
        const { slug, lessonId } = res.locals.validated.params as {
          slug: string;
          lessonId: string;
        };
        const { sectionId } = res.locals.validated.query as {
          sectionId: string;
        };
        success(res, await catalog.getPreviewLesson(slug, sectionId, lessonId));
      } catch (error) {
        next(error);
      }
    },
  );
  router.get("/site-settings/public", async (_req, res, next) => {
    try {
      success(res, await catalog.getPublicSiteSettings());
    } catch (error) {
      next(error);
    }
  });
  router.get(
    "/media/:assetId/metadata",
    validateRequest({ params: mediaAssetParamsSchema }),
    async (_req, res, next) => {
      try {
        const { assetId } = res.locals.validated
          .params as typeof mediaAssetParamsSchema._output;
        success(res, await catalog.getPublicMediaMetadata(assetId));
      } catch (error) {
        next(error);
      }
    },
  );
  return router;
}
