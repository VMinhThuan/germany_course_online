import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { describe, expect, it } from "vitest";
import { parseEnvironment } from "../../src/config/env.js";
import { createSmtpTransportOptions } from "../../src/modules/auth/email-service.js";
import {
  isStagingDatabaseName,
  mongoHosts,
  validateStagingTargetAuthorization,
} from "../../src/config/release-authorization.js";

const root = new URL("../../../", import.meta.url);

describe("BE-06A environment examples and release authorization", () => {
  it("validates the placeholder-only staging environment examples", () => {
    const backendExample = parse(
      readFileSync(new URL("backend/.env.staging.example", root), "utf8"),
    );
    const backendConfig = parseEnvironment(backendExample);
    expect(backendConfig.nodeEnv).toBe("production");
    expect(backendConfig.databaseName).toBe("paniverse_lms_stage");
    expect(backendConfig.lessonCommentsEnabled).toBe(true);
    expect(backendConfig.cookieSecure).toBe(true);
    expect(backendConfig.smtp).toBeUndefined();
    expect(backendConfig.mediaStorage).toBeUndefined();

    const frontendExample = parse(
      readFileSync(new URL("frontend/.env.staging.example", root), "utf8"),
    );
    expect(Object.keys(frontendExample)).toEqual([
      "VITE_API_BASE_URL",
      "VITE_LESSON_COMMENTS_ENABLED",
    ]);
    expect(frontendExample.VITE_API_BASE_URL).toBe(
      "https://api.staging.example.invalid/api/v1",
    );
    expect(frontendExample.VITE_LESSON_COMMENTS_ENABLED).toBe("true");
  });

  it("normalizes MongoDB hosts without exposing credentials", () => {
    expect(
      mongoHosts(
        "mongodb+srv://sample-user:sample-password@staging.example.invalid/?retryWrites=true",
      ),
    ).toEqual(["staging.example.invalid"]);
    expect(
      mongoHosts(
        "mongodb://user:pass@second.invalid:27017,first.invalid:27017/db",
      ),
    ).toEqual(["first.invalid", "second.invalid"]);
  });

  it("requires production semantics, a staging database, and exact target acknowledgements", () => {
    const config = parseEnvironment({
      NODE_ENV: "production",
      MONGODB_URI:
        "mongodb+srv://sample-user:sample-password@staging.example.invalid/?retryWrites=true",
      MONGODB_DB_NAME: "paniverse_lms_stage",
      JWT_ACCESS_SECRET: "sample-placeholder-secret-longer-than-thirty-two",
      JWT_ISSUER: "https://api.staging.example.invalid",
      JWT_AUDIENCE: "paniverse-web",
      APP_ORIGINS: "https://staging.example.invalid",
      COOKIE_SECURE: "true",
    });
    const authorization = {
      targetDatabase: "paniverse_lms_stage",
      confirmedHosts: "staging.example.invalid",
      confirmedReplicaSet: "staging-rs",
      backupCheckpoint: "stage-backup-2026-01",
    };

    expect(isStagingDatabaseName("paniverse_lms_stage")).toBe(true);
    expect(isStagingDatabaseName("paniverse_lms_prod")).toBe(false);
    expect(validateStagingTargetAuthorization(config, authorization)).toEqual({
      expectedHosts: ["staging.example.invalid"],
      expectedDatabase: "paniverse_lms_stage",
    });
    expect(() =>
      validateStagingTargetAuthorization(config, {
        ...authorization,
        targetDatabase: "paniverse_lms_prod",
      }),
    ).toThrow(/MONGODB_DB_NAME/);
    expect(() =>
      validateStagingTargetAuthorization(config, {
        ...authorization,
        confirmedHosts: "other.example.invalid",
      }),
    ).toThrow(/confirm-host/);
    expect(() =>
      validateStagingTargetAuthorization(config, {
        ...authorization,
        backupCheckpoint: "secret value",
      }),
    ).toThrow(/non-secret identifier/);
  });

  it("requires SMTP TLS and bounds transport timeouts", () => {
    const startTls = createSmtpTransportOptions({
      host: "smtp.example.invalid",
      port: 587,
      from: "no-reply@example.invalid",
      user: "sample-user",
      password: "sample-password",
    });
    expect(startTls).toMatchObject({
      secure: false,
      requireTLS: true,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    });

    const implicitTls = createSmtpTransportOptions({
      host: "smtp.example.invalid",
      port: 465,
      from: "no-reply@example.invalid",
      user: undefined,
      password: undefined,
    });
    expect(implicitTls).toMatchObject({ secure: true, requireTLS: false });
  });
});
