import { readFileSync } from "node:fs";
import { createHash, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import express, { type Express, type RequestHandler } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { parse as parseYaml } from "yaml";
import type { Logger } from "pino";
import type { AppConfig } from "./config/env.js";
import { isMongoReady } from "./db/connection.js";
import { createLogger, requestLogger } from "./http/logger.js";
import { requestIdMiddleware } from "./http/request-id.js";
import { createErrorHandler } from "./http/error-handler.js";
import { AppError } from "./shared/errors.js";
import { success } from "./shared/responses.js";
import { AuthService } from "./modules/auth/service.js";
import {
  createEmailService,
  type EmailService,
} from "./modules/auth/email-service.js";
import { createAuthRouter } from "./modules/auth/routes.js";
import { createAccountRouter } from "./modules/account/routes.js";
import { AdminService } from "./modules/admin/service.js";
import { createAdminRouter } from "./modules/admin/routes.js";
import { PublicCatalogService } from "./modules/catalog/service.js";
import { createPublicRouter } from "./modules/catalog/routes.js";
import { LearningService } from "./modules/learning/service.js";
import { QuizService } from "./modules/learning/quiz-service.js";
import { MediaAccessService } from "./modules/learning/media-access-service.js";
import {
  createMediaStorageAdapter,
  type MediaStorageAdapter,
} from "./modules/learning/media-storage.js";
import { createLearningRouter } from "./modules/learning/routes.js";
import { LessonCommentService } from "./modules/lesson-comments/service.js";
import { createLessonCommentRouter } from "./modules/lesson-comments/routes.js";
import { CommerceService } from "./modules/commerce/service.js";
import { createCommerceRouter } from "./modules/commerce/routes.js";
import { EmailOutboxWorker } from "./modules/commerce/email-outbox-worker.js";

// Vercel's Node builder can type this ESM default export as a CJS namespace.
const helmetFactory = helmet as unknown as () => RequestHandler;
const VERCEL_OUTBOX_BATCH_LIMIT = 1;

export type AppDependencies = {
  logger?: Logger;
  emailService?: EmailService;
  mediaStorage?: MediaStorageAdapter;
  readiness?: () => boolean;
  ensureDatabase?: () => Promise<void>;
  lessonCommentsNow?: () => Date;
};

function hasValidCronAuthorization(
  authorization: string | undefined,
  secret: string | undefined,
): boolean {
  const supplied = authorization?.match(/^Bearer\s+([^\s]+)$/i)?.[1] ?? "";
  const suppliedHash = createHash("sha256").update(supplied).digest();
  const expectedHash = createHash("sha256")
    .update(secret ?? "")
    .digest();
  const matches = timingSafeEqual(suppliedHash, expectedHash);
  return Boolean(secret && supplied && matches);
}

function createDatabaseMiddleware(
  ensureDatabase: (() => Promise<void>) | undefined,
): RequestHandler {
  return (_req, _res, next) => {
    if (!ensureDatabase) return next();
    void ensureDatabase()
      .then(() => next())
      .catch(() =>
        next(
          new AppError(
            503,
            "DATABASE_UNAVAILABLE",
            "The database is temporarily unavailable.",
          ),
        ),
      );
  };
}

export function createApp(
  config: AppConfig,
  dependencies: AppDependencies = {},
): Express {
  const logger = dependencies.logger ?? createLogger(config.nodeEnv);
  const emailService = dependencies.emailService ?? createEmailService(config);
  const mediaStorage =
    dependencies.mediaStorage ?? createMediaStorageAdapter(config);
  const authService = new AuthService(
    config,
    emailService,
    logger,
    mediaStorage,
  );
  const catalogService = new PublicCatalogService(mediaStorage);
  const learningService = new LearningService();
  const lessonCommentService = new LessonCommentService(
    config.lessonCommentsEnabled,
    dependencies.lessonCommentsNow,
  );
  const quizService = new QuizService(learningService);
  const mediaAccessService = new MediaAccessService(
    learningService,
    mediaStorage,
  );
  const commerceService = new CommerceService();
  const adminService = new AdminService(mediaStorage);
  const emailOutboxWorker = new EmailOutboxWorker(emailService, {
    ...(config.allowedOrigins[0]
      ? { frontendBaseUrl: config.allowedOrigins[0] }
      : {}),
  });
  const databaseMiddleware = createDatabaseMiddleware(
    dependencies.ensureDatabase,
  );
  const app = express();

  app.disable("x-powered-by");
  app.use(requestIdMiddleware);
  app.use(requestLogger(logger));
  app.use(helmetFactory());
  app.use("/api/v1/auth", (req, res, next) => {
    if (
      ["/login", "/refresh", "/logout"].includes(req.path) &&
      req.header("origin") &&
      config.allowedOrigins.includes(req.header("origin")!)
    ) {
      res.setHeader("access-control-allow-credentials", "true");
    }
    next();
  });
  app.use(
    "/api/v1",
    cors({
      origin(origin, callback) {
        if (!origin || config.allowedOrigins.includes(origin))
          return callback(null, true);
        return callback(null, false);
      },
      credentials: false,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Authorization",
        "Content-Type",
        "X-CSRF-Protection",
        "X-Request-Id",
        "X-Device-Name",
        "Idempotency-Key",
      ],
      exposedHeaders: ["X-Request-Id"],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: "100kb", strict: true }));
  app.use(cookieParser());

  app.get("/health", (_req, res) => success(res, { status: "ok" }));
  app.get("/ready", databaseMiddleware, (_req, res) => {
    const ready = (dependencies.readiness ?? isMongoReady)();
    if (!ready)
      return res.status(503).json({
        success: false,
        error: {
          code: "NOT_READY",
          message: "Database is not ready.",
          details: [],
        },
        requestId: res.locals.requestId,
      });
    success(res, { status: "ready" });
  });

  app.get(
    "/api/internal/email-outbox/process",
    (req, _res, next) => {
      if (!config.cronSecret)
        return next(
          new AppError(
            503,
            "CRON_NOT_CONFIGURED",
            "Scheduled email processing is not configured.",
          ),
        );
      if (
        !hasValidCronAuthorization(
          req.header("authorization"),
          config.cronSecret,
        )
      )
        return next(
          new AppError(401, "UNAUTHORIZED", "Authentication is required."),
        );
      if (!emailService.available)
        return next(
          new AppError(
            503,
            "EMAIL_DELIVERY_NOT_CONFIGURED",
            "Email delivery is not configured.",
          ),
        );
      next();
    },
    databaseMiddleware,
    async (_req, res, next) => {
      res.setHeader("Cache-Control", "no-store");
      try {
        const processed = await emailOutboxWorker.runOnce(
          VERCEL_OUTBOX_BATCH_LIMIT,
        );
        logger.info(
          { requestId: res.locals.requestId, processed },
          "email outbox batch processed",
        );
        success(res, { processed, batchLimit: VERCEL_OUTBOX_BATCH_LIMIT });
      } catch (error) {
        next(error);
      }
    },
  );

  try {
    const openApiPath = fileURLToPath(
      new URL("../openapi.yaml", import.meta.url),
    );
    const openApiDocument = parseYaml(
      readFileSync(openApiPath, "utf8"),
    ) as Record<string, unknown>;
    app.get("/api/openapi.yaml", (_req, res) =>
      res.type("text/yaml").send(readFileSync(openApiPath, "utf8")),
    );
    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
  } catch {
    logger.warn(
      "OpenAPI document could not be loaded; API routes remain available.",
    );
  }

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.nodeEnv === "test" ? 10_000 : 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, res) => {
      const error = new AppError(
        429,
        "RATE_LIMITED",
        "Too many requests. Please try again later.",
      );
      res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message, details: [] },
        requestId: res.locals.requestId,
      });
    },
  });
  app.use("/api/v1", apiLimiter);
  app.use("/api/v1", databaseMiddleware);
  app.use("/api/v1/auth", createAuthRouter(config, authService));
  app.use("/api/v1", createLessonCommentRouter(config, lessonCommentService));
  app.use("/api/v1", createAccountRouter(config, authService));
  app.use("/api/v1", createAdminRouter(config, adminService));
  app.use("/api/v1", createCommerceRouter(config, commerceService));
  app.use(
    "/api/v1",
    createLearningRouter(config, {
      learning: learningService,
      quizzes: quizService,
      media: mediaAccessService,
    }),
  );
  app.use("/api/v1", createPublicRouter(catalogService));
  app.use((_req, _res, next) =>
    next(new AppError(404, "NOT_FOUND", "Route not found.")),
  );
  app.use(createErrorHandler(logger));
  app.locals.emailService = emailService;
  app.locals.authService = authService;
  app.locals.learningService = learningService;
  app.locals.lessonCommentService = lessonCommentService;
  app.locals.mediaAccessService = mediaAccessService;
  app.locals.commerceService = commerceService;
  app.locals.adminService = adminService;
  app.locals.emailOutboxWorker = emailOutboxWorker;
  return app;
}
