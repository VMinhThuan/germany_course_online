import { afterEach, describe, expect, it } from "vitest";
import { parseEnvironment } from "../../src/config/env.js";
import {
  connectMongo,
  createLazyConnection,
  disconnectMongo,
} from "../../src/db/connection.js";

const config = parseEnvironment({
  NODE_ENV: "test",
  MONGODB_URI: "mongodb://127.0.0.1:1",
  MONGODB_DB_NAME: "paniverse_lms_connection_test",
  JWT_ACCESS_SECRET: "test-only-signing-secret-at-least-32-chars",
  JWT_ISSUER: "https://api.test.invalid",
  JWT_AUDIENCE: "test-client",
  APP_ORIGINS: "http://localhost:5173",
});

describe("MongoDB connection manager", () => {
  afterEach(async () => disconnectMongo());

  it("fails promptly when the configured test database is unreachable", async () => {
    await expect(connectMongo(config, 250)).rejects.toBeDefined();
  });

  it("shares concurrent lazy connection attempts and retries a failed attempt", async () => {
    let attempts = 0;
    let ready = false;
    const ensureConnected = createLazyConnection(
      async () => {
        attempts += 1;
        if (attempts === 1) throw new Error("synthetic connection failure");
        ready = true;
      },
      () => ready,
    );

    const first = await Promise.allSettled([
      ensureConnected(),
      ensureConnected(),
    ]);
    expect(first.map((result) => result.status)).toEqual([
      "rejected",
      "rejected",
    ]);
    expect(attempts).toBe(1);

    await Promise.all([ensureConnected(), ensureConnected()]);
    await ensureConnected();
    expect(attempts).toBe(2);
  });
});
