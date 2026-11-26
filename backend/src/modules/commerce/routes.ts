import { Router } from "express";
import type { AppConfig } from "../../config/env.js";
import { validateRequest } from "../../http/validation.js";
import { AppError, unauthorized } from "../../shared/errors.js";
import { success } from "../../shared/responses.js";
import { authenticate, requireRole } from "../auth/middleware.js";
import { CommerceService } from "./service.js";
import {
  adminOrderQuerySchema,
  adminOrderCancelSchema,
  adminOrderRejectSchema,
  checkoutQuoteQuerySchema,
  courseIdParamsSchema,
  couponValidateSchema,
  emailOutboxIdParamsSchema,
  emailOutboxQuerySchema,
  orderApprovalSchema,
  orderCreateSchema,
  orderIdParamsSchema,
  paymentProofAssetParamsSchema,
  paymentProofCompleteSchema,
  paymentProofUploadIntentSchema,
  pageQuerySchema,
  siteSettingsPatchSchema,
} from "./schemas.js";

export function createCommerceRouter(
  config: AppConfig,
  commerce: CommerceService,
): Router {
  const router = Router();
  router.use(
    ["/checkout", "/orders"],
    authenticate(config),
    requireRole("STUDENT"),
  );
  router.use(
    ["/coupons", "/renewals"],
    authenticate(config),
    requireRole("STUDENT"),
  );
  router.use("/admin", authenticate(config), requireRole("ADMIN"));

  router.get(
    "/checkout/quote",
    validateRequest({ query: checkoutQuoteQuerySchema }),
    async (req, res, next) => {
      try {
        if (!req.auth) throw unauthorized();
        success(
          res,
          await commerce.quote(req.auth.sub, res.locals.validated.query),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/coupons/validate",
    validateRequest({ body: couponValidateSchema }),
    async (req, res, next) => {
      try {
        if (!req.auth) throw unauthorized();
        success(
          res,
          await commerce.validateCoupon(
            req.auth.sub,
            res.locals.validated.body,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/renewals/courses/:courseId/plans",
    validateRequest({ params: courseIdParamsSchema }),
    async (req, res, next) => {
      try {
        if (!req.auth) throw unauthorized();
        success(
          res,
          await commerce.listRenewalPlans(
            req.auth.sub,
            res.locals.validated.params.courseId,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/orders",
    validateRequest({ body: orderCreateSchema }),
    async (req, res, next) => {
      try {
        if (!req.auth) throw unauthorized();
        const key = req.header("idempotency-key");
        if (key !== undefined && (key.length < 8 || key.length > 128))
          throw new AppError(
            400,
            "VALIDATION_ERROR",
            "Idempotency-Key must contain 8 to 128 characters.",
          );
        const result = await commerce.createOrder(
          req.auth.sub,
          res.locals.validated.body,
          key,
        );
        success(res, result.detail, result.replayed ? 200 : 201);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/orders",
    validateRequest({ query: pageQuerySchema }),
    async (req, res, next) => {
      try {
        if (!req.auth) throw unauthorized();
        success(
          res,
          await commerce.listOwnedOrders(
            req.auth.sub,
            res.locals.validated.query,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/orders/:orderId",
    validateRequest({ params: orderIdParamsSchema }),
    async (req, res, next) => {
      try {
        if (!req.auth) throw unauthorized();
        success(
          res,
          await commerce.getOwnedOrder(
            req.auth.sub,
            res.locals.validated.params.orderId,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/orders/:orderId/cancel",
    validateRequest({ params: orderIdParamsSchema }),
    async (req, res, next) => {
      try {
        if (!req.auth) throw unauthorized();
        success(
          res,
          await commerce.cancelStudentOrder(
            req.auth.sub,
            res.locals.validated.params.orderId,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/orders/:orderId/confirm-transfer",
    validateRequest({ params: orderIdParamsSchema }),
    async (req, res, next) => {
      try {
        if (!req.auth) throw unauthorized();
        success(
          res,
          await commerce.confirmTransfer(
            req.auth.sub,
            res.locals.validated.params.orderId,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/orders/:orderId/payment-proof/upload-intents",
    validateRequest({
      params: orderIdParamsSchema,
      body: paymentProofUploadIntentSchema,
    }),
    async (req, res, next) => {
      try {
        if (!req.auth) throw unauthorized();
        success(
          res,
          await commerce.createPaymentProofUploadIntent(
            req.auth.sub,
            res.locals.validated.params.orderId,
            res.locals.validated.body,
          ),
          201,
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/orders/:orderId/payment-proof/complete",
    validateRequest({
      params: orderIdParamsSchema,
      body: paymentProofCompleteSchema,
    }),
    async (req, res, next) => {
      try {
        if (!req.auth) throw unauthorized();
        success(
          res,
          await commerce.completePaymentProof(
            req.auth.sub,
            res.locals.validated.params.orderId,
            res.locals.validated.body.assetId,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/orders/:orderId/payment-proof",
    validateRequest({ params: orderIdParamsSchema }),
    async (req, res, next) => {
      try {
        if (!req.auth) throw unauthorized();
        success(
          res,
          await commerce.deletePaymentProof(
            req.auth.sub,
            res.locals.validated.params.orderId,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/orders/:orderId/payment-proof",
    validateRequest({ params: orderIdParamsSchema }),
    async (req, res, next) => {
      try {
        if (!req.auth) throw unauthorized();
        res.setHeader("Cache-Control", "private, no-store");
        success(
          res,
          await commerce.getPaymentProofAccess(
            res.locals.validated.params.orderId,
            req.auth.sub,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/admin/orders",
    validateRequest({ query: adminOrderQuerySchema }),
    async (_req, res, next) => {
      try {
        success(
          res,
          await commerce.listAdminOrders(res.locals.validated.query),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get("/admin/dashboard-summary", async (_req, res, next) => {
    try {
      success(res, await commerce.getAdminDashboardSummary());
    } catch (error) {
      next(error);
    }
  });

  router.get(
    "/admin/email-outbox",
    validateRequest({ query: emailOutboxQuerySchema }),
    async (_req, res, next) => {
      try {
        success(
          res,
          await commerce.listFailedEmailOutbox(res.locals.validated.query),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/admin/email-outbox/:messageId/retry",
    validateRequest({ params: emailOutboxIdParamsSchema }),
    async (req, res, next) => {
      try {
        if (!req.auth) throw unauthorized();
        success(
          res,
          await commerce.retryFailedEmail(
            req.auth.sub,
            res.locals.validated.params.messageId,
            req.ip ?? null,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/admin/orders/:orderId",
    validateRequest({ params: orderIdParamsSchema }),
    async (_req, res, next) => {
      try {
        success(
          res,
          await commerce.getAdminOrder(res.locals.validated.params.orderId),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/admin/orders/:orderId/payment-proof",
    validateRequest({ params: orderIdParamsSchema }),
    async (_req, res, next) => {
      try {
        res.setHeader("Cache-Control", "private, no-store");
        success(
          res,
          await commerce.getPaymentProofAccess(
            res.locals.validated.params.orderId,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/admin/orders/:orderId/payment-proofs/:assetId",
    validateRequest({ params: paymentProofAssetParamsSchema }),
    async (_req, res, next) => {
      try {
        res.setHeader("Cache-Control", "private, no-store");
        success(
          res,
          await commerce.getPaymentProofAccess(
            res.locals.validated.params.orderId,
            undefined,
            res.locals.validated.params.assetId,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/admin/orders/:orderId/cancel",
    validateRequest({
      params: orderIdParamsSchema,
      body: adminOrderCancelSchema,
    }),
    async (req, res, next) => {
      try {
        if (!req.auth) throw unauthorized();
        success(
          res,
          await commerce.cancelAdminOrder(
            req.auth.sub,
            res.locals.validated.params.orderId,
            res.locals.validated.body,
            req.ip ?? null,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/admin/orders/:orderId/reject",
    validateRequest({
      params: orderIdParamsSchema,
      body: adminOrderRejectSchema,
    }),
    async (req, res, next) => {
      try {
        if (!req.auth) throw unauthorized();
        success(
          res,
          await commerce.rejectOrder(
            req.auth.sub,
            res.locals.validated.params.orderId,
            res.locals.validated.body.reason,
            req.ip ?? null,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/admin/orders/:orderId/approve",
    validateRequest({ params: orderIdParamsSchema, body: orderApprovalSchema }),
    async (req, res, next) => {
      try {
        if (!req.auth) throw unauthorized();
        const body = res.locals.validated.body as { reviewNote?: string };
        success(
          res,
          await commerce.approveOrder(
            req.auth.sub,
            res.locals.validated.params.orderId,
            body.reviewNote,
            req.ip ?? null,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get("/admin/site-settings", async (_req, res, next) => {
    try {
      success(res, await commerce.getAdminSiteSettings());
    } catch (error) {
      next(error);
    }
  });

  router.patch(
    "/admin/site-settings",
    validateRequest({ body: siteSettingsPatchSchema }),
    async (req, res, next) => {
      try {
        if (!req.auth) throw unauthorized();
        success(
          res,
          await commerce.patchAdminSiteSettings(
            req.auth.sub,
            res.locals.validated.body,
            req.ip ?? null,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
