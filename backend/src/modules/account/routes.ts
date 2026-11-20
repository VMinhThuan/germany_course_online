import { Router } from "express";
import { z } from "zod";
import type { AppConfig } from "../../config/env.js";
import { validateRequest } from "../../http/validation.js";
import { unauthorized } from "../../shared/errors.js";
import { success } from "../../shared/responses.js";
import { authenticate, requireRole } from "../auth/middleware.js";
import { AuthService } from "../auth/service.js";

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/);
const profilePatchSchema = z
  .strictObject({
    fullName: z.string().trim().min(1).max(120).optional(),
    phone: z.string().trim().max(32).nullable().optional(),
    avatarAssetId: objectId.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0);
const passwordChangeSchema = z
  .strictObject({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(12).max(128),
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ["newPassword"],
  });
const sessionIdSchema = z.strictObject({ sessionId: objectId });

export function createAccountRouter(
  config: AppConfig,
  auth: AuthService,
): Router {
  const router = Router();
  router.use("/me", authenticate(config));

  router.get("/me/profile", requireRole("STUDENT"), async (req, res, next) => {
    try {
      if (!req.auth) throw unauthorized();
      success(res, await auth.me(req.auth.sub));
    } catch (error) {
      next(error);
    }
  });

  router.patch(
    "/me/profile",
    requireRole("STUDENT"),
    validateRequest({ body: profilePatchSchema }),
    async (req, res, next) => {
      try {
        if (!req.auth) throw unauthorized();
        success(
          res,
          await auth.updateMyProfile(
            req.auth.sub,
            res.locals.validated.body as typeof profilePatchSchema._output,
            req.ip ?? null,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.put(
    "/me/password",
    requireRole("STUDENT", "ADMIN"),
    validateRequest({ body: passwordChangeSchema }),
    async (req, res, next) => {
      try {
        if (!req.auth) throw unauthorized();
        const body = res.locals.validated
          .body as typeof passwordChangeSchema._output;
        await auth.changeMyPassword(
          req.auth.sub,
          body.currentPassword,
          body.newPassword,
          req.auth.role,
          req.ip ?? null,
        );
        success(res, {});
      } catch (error) {
        next(error);
      }
    },
  );

  router.get("/me/sessions", requireRole("STUDENT"), async (req, res, next) => {
    try {
      if (!req.auth) throw unauthorized();
      success(res, await auth.listMySessions(req.auth.sub, req.auth.sid));
    } catch (error) {
      next(error);
    }
  });

  router.delete(
    "/me/sessions/:sessionId",
    requireRole("STUDENT"),
    validateRequest({ params: sessionIdSchema }),
    async (req, res, next) => {
      try {
        if (!req.auth) throw unauthorized();
        const { sessionId } = res.locals.validated
          .params as typeof sessionIdSchema._output;
        await auth.revokeMySession(req.auth.sub, sessionId, req.ip ?? null);
        success(res, {});
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
