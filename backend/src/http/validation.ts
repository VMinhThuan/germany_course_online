import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { AppError } from "../shared/errors.js";

export function validateRequest(schemas: {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}): RequestHandler {
  return (req, res, next) => {
    const parsed: Record<string, unknown> = {};
    const issues: Array<{ path?: string; code: string }> = [];
    for (const key of ["params", "query", "body"] as const) {
      const schema = schemas[key];
      if (!schema) continue;
      const result = schema.safeParse(req[key]);
      if (!result.success) {
        issues.push(
          ...result.error.issues.map((issue) => ({
            path: issue.path.join("."),
            code: issue.code,
          })),
        );
      } else {
        parsed[key] = result.data;
      }
    }
    if (issues.length)
      return next(
        new AppError(
          400,
          "VALIDATION_ERROR",
          "Request validation failed.",
          issues,
        ),
      );
    res.locals.validated = parsed;
    next();
  };
}
