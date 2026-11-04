import "dotenv/config";
import type { Server } from "node:http";
import { parseEnvironment } from "./config/env.js";
import { connectMongo, disconnectMongo } from "./db/connection.js";
import { ensureIndexes } from "./db/ensure-indexes.js";
import { createApp } from "./application.js";
import { createLogger } from "./http/logger.js";
import { closeHttpServer, listenHttp } from "./http/server-lifecycle.js";
import { EmailOutboxWorker } from "./modules/commerce/email-outbox-worker.js";

async function main(): Promise<void> {
  const config = parseEnvironment(process.env);
  const logger = createLogger(config.nodeEnv);
  try {
    await connectMongo(config);
    if (config.nodeEnv !== "production") await ensureIndexes();
  } catch (error) {
    logger.fatal(
      { errorType: error instanceof Error ? error.name : "UnknownError" },
      "startup failed",
    );
    await disconnectMongo().catch(() => undefined);
    process.exitCode = 1;
    return;
  }

  const app = createApp(config, { logger });
  let server: Server;
  try {
    server = await listenHttp(app, config.port, logger);
  } catch (error) {
    logger.fatal(
      { errorType: error instanceof Error ? error.name : "UnknownError" },
      "http listener failed",
    );
    await disconnectMongo().catch(() => undefined);
    process.exitCode = 1;
    return;
  }

  let shuttingDown = false;
  const emailOutboxWorker = app.locals.emailOutboxWorker as EmailOutboxWorker;
  emailOutboxWorker.start();
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    void closeHttpServer(server, disconnectMongo, logger, signal, () =>
      emailOutboxWorker.stop(),
    )
      .then(() => {
        process.exitCode = 0;
      })
      .catch(() => {
        process.exitCode = 1;
      });
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

void main().catch((error: unknown) => {
  const logger = createLogger(process.env.NODE_ENV ?? "production");
  logger.fatal(
    { errorType: error instanceof Error ? error.name : "UnknownError" },
    "server startup failed",
  );
  process.exitCode = 1;
});
