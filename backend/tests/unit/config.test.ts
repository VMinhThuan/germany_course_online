import { describe, expect, it } from "vitest";
import { parseEnvironment } from "../../src/config/env.js";

const baseEnv = {
  NODE_ENV: "test",
  MONGODB_URI: "mongodb://127.0.0.1:27017",
  MONGODB_DB_NAME: "paniverse_test",
  JWT_ACCESS_SECRET: "test-only-signing-secret-at-least-32-chars",
  JWT_ISSUER: "https://api.test.invalid",
  JWT_AUDIENCE: "test-client",
  APP_ORIGINS: "http://localhost:5173",
};

describe("parseEnvironment", () => {
  it("requires an explicit database name and strong JWT secret", () => {
    expect(() =>
      parseEnvironment({ ...baseEnv, MONGODB_DB_NAME: undefined }),
    ).toThrow(/MONGODB_DB_NAME/);
    expect(() =>
      parseEnvironment({ ...baseEnv, JWT_ACCESS_SECRET: "short" }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it("rejects Atlas or other remote hosts in development", () => {
    expect(() =>
      parseEnvironment({
        ...baseEnv,
        NODE_ENV: "development",
        MONGODB_URI: "mongodb+srv://example.invalid/db",
      }),
    ).toThrow(/loopback/);
  });

  it("requires a test-scoped database name in test mode", () => {
    expect(() =>
      parseEnvironment({ ...baseEnv, MONGODB_DB_NAME: "paniverse_lms" }),
    ).toThrow(/include "test"/);
    expect(() =>
      parseEnvironment({
        ...baseEnv,
        MONGODB_URI: "mongodb+srv://cluster.example.invalid",
        MONGODB_DB_NAME: "paniverse_test",
      }),
    ).toThrow(/loopback/);
  });

  it("normalizes an exact origin allowlist without exposing environment values", () => {
    const parsed = parseEnvironment({
      ...baseEnv,
      APP_ORIGINS: "http://localhost:5173, https://student.example.com",
    });
    expect(parsed.allowedOrigins).toEqual([
      "http://localhost:5173",
      "https://student.example.com",
    ]);
    expect(parsed.mongoUri).toBe(baseEnv.MONGODB_URI);
  });

  it("rejects wildcard or path-bearing origins", () => {
    expect(() => parseEnvironment({ ...baseEnv, APP_ORIGINS: "*" })).toThrow(
      /APP_ORIGINS/,
    );
    expect(() =>
      parseEnvironment({
        ...baseEnv,
        APP_ORIGINS: "https://student.example.com/path",
      }),
    ).toThrow(/APP_ORIGINS/);
  });

  it("requires a secure refresh cookie in production", () => {
    expect(() =>
      parseEnvironment({
        ...baseEnv,
        NODE_ENV: "production",
        APP_ORIGINS: "https://app.example.test",
        COOKIE_SECURE: "false",
      }),
    ).toThrow(/Secure/);
    expect(
      parseEnvironment({
        ...baseEnv,
        NODE_ENV: "production",
        APP_ORIGINS: "https://app.example.test",
        MONGODB_DB_NAME: "paniverse_lms_prod",
        COOKIE_SECURE: "true",
      }).cookieSecure,
    ).toBe(true);
    expect(() =>
      parseEnvironment({
        ...baseEnv,
        NODE_ENV: "production",
        APP_ORIGINS: "https://app.example.test",
        MONGODB_DB_NAME: "paniverse_lms_test",
        COOKIE_SECURE: "true",
      }),
    ).toThrow(/database name/);
  });

  it("accepts only a sufficiently long optional cron secret", () => {
    expect(parseEnvironment(baseEnv).cronSecret).toBeUndefined();
    expect(() =>
      parseEnvironment({ ...baseEnv, CRON_SECRET: "too-short" }),
    ).toThrow(/CRON_SECRET/);
    expect(
      parseEnvironment({
        ...baseEnv,
        CRON_SECRET: "synthetic-cron-secret-for-local-tests-123456",
      }).cronSecret,
    ).toBe("synthetic-cron-secret-for-local-tests-123456");
  });

  it("rejects invalid boolean environment values instead of silently treating them as false", () => {
    expect(() =>
      parseEnvironment({ ...baseEnv, COOKIE_SECURE: "sometimes" }),
    ).toThrow(/COOKIE_SECURE/);
  });

  it("requires a complete SMTP configuration and reset URL when mail is configured", () => {
    expect(() =>
      parseEnvironment({
        ...baseEnv,
        SMTP_HOST: "smtp.example.test",
        SMTP_PORT: "587",
      }),
    ).toThrow(/SMTP_FROM/);
    expect(() =>
      parseEnvironment({
        ...baseEnv,
        SMTP_HOST: "smtp.example.test",
        SMTP_PORT: "587",
        SMTP_FROM: "no-reply@example.test",
      }),
    ).toThrow(/PASSWORD_RESET_URL/);
  });

  it("requires a complete S3-compatible media configuration and uses a bounded URL lifetime", () => {
    expect(() =>
      parseEnvironment({
        ...baseEnv,
        MEDIA_S3_ENDPOINT: "https://objects.example.test",
      }),
    ).toThrow(/all MEDIA_S3_\* settings/);

    const media = {
      MEDIA_S3_ENDPOINT: "https://objects.example.test",
      MEDIA_S3_BUCKET: "paniverse-media",
      MEDIA_S3_REGION: "auto",
      MEDIA_S3_ACCESS_KEY_ID: "test-access-key",
      MEDIA_S3_SECRET_ACCESS_KEY: "test-secret-key",
    };
    expect(
      parseEnvironment({ ...baseEnv, ...media }).mediaStorage,
    ).toMatchObject({
      endpoint: media.MEDIA_S3_ENDPOINT,
      bucket: media.MEDIA_S3_BUCKET,
      region: media.MEDIA_S3_REGION,
      signedUrlTtlSeconds: 300,
    });
    expect(() =>
      parseEnvironment({
        ...baseEnv,
        ...media,
        MEDIA_SIGNED_URL_TTL_SECONDS: "59",
      }),
    ).toThrow(/MEDIA_SIGNED_URL_TTL_SECONDS/);
  });

  it("requires HTTPS for production S3-compatible endpoints", () => {
    const productionEnv = {
      ...baseEnv,
      NODE_ENV: "production",
      MONGODB_URI: "mongodb+srv://production.example.test/paniverse",
      MONGODB_DB_NAME: "paniverse_prod",
      APP_ORIGINS: "https://app.example.test",
      COOKIE_SECURE: "true",
      ...{
        MEDIA_S3_BUCKET: "paniverse-media",
        MEDIA_S3_REGION: "auto",
        MEDIA_S3_ACCESS_KEY_ID: "test-access-key",
        MEDIA_S3_SECRET_ACCESS_KEY: "test-secret-key",
      },
    };
    expect(() =>
      parseEnvironment({
        ...productionEnv,
        MEDIA_S3_ENDPOINT: "http://objects.example.test",
      }),
    ).toThrow(/MEDIA_S3_ENDPOINT must use HTTPS/);
    expect(
      parseEnvironment({
        ...productionEnv,
        MEDIA_S3_ENDPOINT: "https://objects.example.test",
      }).mediaStorage?.endpoint,
    ).toBe("https://objects.example.test");
  });

  it("requires HTTPS for production origins and password-reset links", () => {
    const production = {
      ...baseEnv,
      NODE_ENV: "production",
      MONGODB_URI: "mongodb+srv://staging.example.test",
      MONGODB_DB_NAME: "paniverse_lms_stage",
      COOKIE_SECURE: "true",
    };
    expect(() =>
      parseEnvironment({
        ...production,
        APP_ORIGINS: "http://app.example.test",
      }),
    ).toThrow(/APP_ORIGINS must use HTTPS/);
    expect(() =>
      parseEnvironment({
        ...production,
        APP_ORIGINS: "https://app.example.test",
        PASSWORD_RESET_URL: "http://app.example.test/reset-password",
        SMTP_HOST: "smtp.example.test",
        SMTP_PORT: "587",
        SMTP_FROM: "no-reply@example.test",
      }),
    ).toThrow(/PASSWORD_RESET_URL must use HTTPS/);
  });
});
