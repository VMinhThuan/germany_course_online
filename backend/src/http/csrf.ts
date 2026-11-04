import type { RequestHandler } from "express";
import type { AppConfig } from "../config/env.js";
import { forbidden } from "../shared/errors.js";

export function requireRefreshCsrf(config: AppConfig): RequestHandler {
  return (req, _res, next) => {
    const origin = req.header("origin");
    const header = req.header("x-csrf-protection");
    if (!origin || !config.allowedOrigins.includes(origin) || header !== "1") {
      return next(
        forbidden(
          "CSRF_REJECTED",
          "The request origin or CSRF check was rejected.",
        ),
      );
    }
    next();
  };
}
