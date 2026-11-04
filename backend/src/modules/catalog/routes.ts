import { Router } from "express";
import { success } from "../../shared/responses.js";
import { validateRequest } from "../../http/validation.js";
import { PublicCatalogService } from "./service.js";
import {
  courseListQuerySchema,
  courseSlugParamsSchema,
  mediaAssetParamsSchema,
} from "./schemas.js";

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
