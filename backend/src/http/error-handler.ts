import type { ErrorRequestHandler } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import type { Logger } from "pino";
import { AppError } from "../shared/errors.js";

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, req, res, _next) => {
    if (res.headersSent) return;
    let appError: AppError;
    if (error instanceof AppError) {
      appError = error;
    } else if (error instanceof ZodError) {
      appError = new AppError(
        400,
        "VALIDATION_ERROR",
        "Request validation failed.",
        error.issues.map((issue) => ({
          path: issue.path.join("."),
          code: issue.code,
        })),
      );
    } else if (
      error instanceof mongoose.Error.ValidationError ||
      error instanceof mongoose.Error.CastError
    ) {
      appError = new AppError(
        400,
        "VALIDATION_ERROR",
        "Request validation failed.",
      );
    } else if (isRequestBodyError(error)) {
      appError = new AppError(
        400,
        "VALIDATION_ERROR",
        "Request body is invalid or exceeds the configured size limit.",
      );
    } else if (isDuplicateKeyError(error)) {
      appError = new AppError(
        409,
        "CONFLICT",
        "A resource with these details already exists.",
      );
    } else {
      appError = new AppError(
        500,
        "INTERNAL_ERROR",
        "An unexpected error occurred.",
      );
    }

    if (appError.statusCode >= 500) {
      logger.error(
        {
          requestId: res.locals.requestId,
          errorType: error instanceof Error ? error.name : "UnknownError",
        },
        "request failed",
      );
    }
    res.status(appError.statusCode).json({
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
        details: appError.details,
      },
      requestId: res.locals.requestId,
    });
  };
}

export function isDuplicateKeyError(error: unknown): error is { code: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function isRequestBodyError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("type" in error)) {
    return false;
  }
  return (
    error.type === "entity.parse.failed" || error.type === "entity.too.large"
  );
}
