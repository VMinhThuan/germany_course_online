import pino, { type Logger } from "pino";
import type { RequestHandler } from "express";

export function createLogger(environment: string): Logger {
  return pino({
    level: environment === "test" ? "silent" : "info",
    redact: {
      paths: [
        "*.password",
        "*.passwordHash",
        "*.token",
        "*.tokenHash",
        "*.refreshToken",
        "*.authorization",
        "*.cookie",
        "*.smtpPassword",
        "*.mongoUri",
      ],
      censor: "[REDACTED]",
    },
    base: { service: "paniverse-lms-api" },
  });
}

export function requestLogger(logger: Logger): RequestHandler {
  return (req, res, next) => {
    const startedAt = process.hrtime.bigint();
    res.on("finish", () => {
      const durationMs =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      logger.info(
        {
          requestId: res.locals.requestId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          durationMs: Math.round(durationMs * 100) / 100,
        },
        "request completed",
      );
    });
    next();
  };
}
