import { createServer } from "node:http";
import mongoose from "mongoose";
import { createApp } from "../../src/application.js";
import type { AppConfig } from "../../src/config/env.js";
import { createLogger } from "../../src/http/logger.js";
import { FakeEmailService } from "../../src/modules/auth/email-service.js";
import { UnconfiguredMediaStorage } from "../../src/modules/learning/media-storage.js";
import { STAGING_DATABASE_NAME } from "./manifest.js";

const uri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB_NAME;
if (!uri || databaseName !== STAGING_DATABASE_NAME)
  throw new Error(
    "The local verification server requires the approved staging environment.",
  );
const host = new URL(
  uri.replace(/^mongodb\+srv:/, "https:").replace(/^mongodb:/, "http:"),
).hostname;
if (host !== "cluster0.arsopo1.mongodb.net")
  throw new Error(
    "The local verification server rejected an unapproved MongoDB cluster.",
  );

await mongoose.connect(uri, {
  dbName: databaseName,
  autoIndex: false,
  appName: "paniverse-lms-be-08a-ui-verification",
});
const config: AppConfig = {
  nodeEnv: "test",
  port: 4142,
  mongoUri: "mongodb://127.0.0.1/paniverse_lms_verification",
  databaseName,
  jwtAccessSecret: "local-only-verification-secret-at-least-32-characters",
  jwtIssuer: "https://api.verification.invalid",
  jwtAudience: "paniverse-ui-verification",
  accessTokenTtlSeconds: 900,
  sessionTtlDays: 30,
  allowedOrigins: ["http://127.0.0.1:4173"],
  cookieSecure: false,
  cookieSameSite: "lax",
  passwordResetUrl: undefined,
  smtp: undefined,
  mediaStorage: undefined,
  mediaProvider: undefined,
  cloudinaryMedia: undefined,
};
const server = createServer(
  createApp(config, {
    logger: createLogger("test"),
    emailService: new FakeEmailService(),
    mediaStorage: new UnconfiguredMediaStorage(),
    readiness: () => true,
  }),
);
const port = Number(process.env.COURSE_IMPORT_VERIFY_PORT ?? 4142);
server.listen(port, "127.0.0.1", () => {
  process.stdout.write(
    `Staging API verification server ready on 127.0.0.1:${port}\n`,
  );
});

async function shutdown() {
  server.close();
  await mongoose.disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
