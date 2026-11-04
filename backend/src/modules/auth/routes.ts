import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import type { AppConfig } from "../../config/env.js";
import { unauthorized } from "../../shared/errors.js";
import { success } from "../../shared/responses.js";
import { requireRefreshCsrf } from "../../http/csrf.js";
import { validateRequest } from "../../http/validation.js";
import { authenticate, requireRole } from "./middleware.js";
import { AuthService } from "./service.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./schemas.js";
import { verifyAccessToken } from "./jwt.js";

type LimitOptions = Pick<
  NonNullable<Parameters<typeof rateLimit>[0]>,
  "windowMs" | "limit" | "standardHeaders" | "legacyHeaders" | "handler"
>;

export function createAuthRouter(config: AppConfig, auth: AuthService): Router {
  const router = Router();
  const csrf = requireRefreshCsrf(config);
  const limitResponse: NonNullable<
    Parameters<typeof rateLimit>[0]
  >["handler"] = (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Please try again later.",
        details: [],
      },
      requestId: res.locals.requestId,
    });
  };
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.nodeEnv === "test" ? 10_000 : 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: limitResponse,
  } satisfies LimitOptions);
  const resetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.nodeEnv === "test" ? 10_000 : 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: limitResponse,
  } satisfies LimitOptions);

  router.post(
    "/register",
    validateRequest({ body: registerSchema }),
    async (req, res, next) => {
      try {
        const user = await auth.register(
          res.locals.validated.body as typeof registerSchema._output,
        );
        success(res, user, 201);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/login",
    loginLimiter,
    validateRequest({ body: loginSchema }),
    async (req, res, next) => {
      try {
        const result = await auth.login(
          res.locals.validated.body as typeof loginSchema._output,
          {
            ipAddress: req.ip ?? null,
            userAgent: req.get("user-agent")?.slice(0, 512) ?? null,
            deviceName: req.get("x-device-name")?.slice(0, 160) ?? null,
          },
        );
        res.cookie(
          auth.refreshCookieName,
          result.refreshToken,
          auth.getRefreshCookieOptions(result.expiresAt),
        );
        success(res, {
          accessToken: result.accessToken,
          expiresIn: result.expiresIn,
          user: result.profile,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post("/refresh", csrf, async (req, res, next) => {
    try {
      const result = await auth.refresh(req.cookies?.[auth.refreshCookieName]);
      res.cookie(
        auth.refreshCookieName,
        result.rotatedToken,
        auth.getRefreshCookieOptions(result.expiresAt),
      );
      success(res, {
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
        user: result.profile,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/logout", csrf, async (req, res, next) => {
    try {
      const token = req
        .header("authorization")
        ?.match(/^Bearer ([^\s]+)$/i)?.[1];
      if (!token) throw unauthorized();
      const claims = await verifyAccessToken(config, token).catch(() => {
        throw unauthorized();
      });
      await auth.logout(claims.sid, claims.sub);
      res.clearCookie(auth.refreshCookieName, {
        httpOnly: true,
        secure: config.cookieSecure,
        sameSite: config.cookieSameSite,
        path: "/api/v1/auth",
      });
      success(res, {});
    } catch (error) {
      next(error);
    }
  });

  router.post(
    "/password/forgot",
    resetLimiter,
    validateRequest({ body: forgotPasswordSchema }),
    async (_req, res, next) => {
      try {
        const { email } = res.locals.validated
          .body as typeof forgotPasswordSchema._output;
        await auth.forgotPassword(email);
        success(res, {
          message:
            "If an account exists for this email, reset instructions can be delivered when email is configured.",
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/password/reset",
    resetLimiter,
    validateRequest({ body: resetPasswordSchema }),
    async (_req, res, next) => {
      try {
        const { token, newPassword } = res.locals.validated
          .body as typeof resetPasswordSchema._output;
        await auth.resetPassword(token, newPassword);
        success(res, {});
      } catch (error) {
        next(error);
      }
    },
  );

  router.get("/me", authenticate(config), async (req, res, next) => {
    try {
      if (!req.auth) throw unauthorized();
      success(res, await auth.me(req.auth.sub));
    } catch (error) {
      next(error);
    }
  });

  if (config.nodeEnv === "test") {
    router.get(
      "/__test/admin",
      authenticate(config),
      requireRole("ADMIN"),
      (_req, res) => success(res, { allowed: true }),
    );
  }
  return router;
}
