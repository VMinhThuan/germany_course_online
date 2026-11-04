import { createRequire } from "node:module";
import express, { type Express, type RequestHandler } from "express";
import { parseEnvironment, type AppConfig } from "../config/env.js";
import { createApp, type AppDependencies } from "../app.js";
import { createVercelMongoConnection } from "../db/connection.js";
import { requestIdMiddleware } from "../http/request-id.js";
import { success } from "../shared/responses.js";

const helmet = createRequire(import.meta.url)("helmet") as () => RequestHandler;

export function createVercelApp(
  config: AppConfig,
  dependencies: AppDependencies = {},
): Express {
  return createApp(config, {
    ...dependencies,
    ensureDatabase:
      dependencies.ensureDatabase ?? createVercelMongoConnection(config),
  });
}

function createConfigurationUnavailableApp(): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(requestIdMiddleware);
  app.use(helmet());
  app.get("/health", (_req, res) => success(res, { status: "ok" }));
  app.use((_req, res) => {
    res.status(503).json({
      success: false,
      error: {
        code: "CONFIGURATION_UNAVAILABLE",
        message: "The backend is not configured.",
        details: [],
      },
      requestId: res.locals.requestId,
    });
  });
  return app;
}

export function createVercelHandler(
  environment: NodeJS.ProcessEnv | Record<string, string | undefined>,
): Express {
  let config: AppConfig;
  try {
    config = parseEnvironment(environment);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("Invalid environment configuration:")
    ) {
      return createConfigurationUnavailableApp();
    }
    throw error;
  }
  return createVercelApp(config);
}
