import "dotenv/config";
import { URL } from "node:url";
import mongoose from "mongoose";
import {
  AdminBootstrapError,
  createInitialAdmin,
} from "../src/modules/admin/admin-bootstrap.js";

const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be provided.`);
  return value;
}

async function main(): Promise<void> {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  if (!new Set(["development", "test"]).has(nodeEnv))
    throw new Error(
      "Test Admin seed is restricted to NODE_ENV=development or NODE_ENV=test.",
    );

  const mongoUri = required("MONGODB_URI");
  const databaseName = required("MONGODB_DB_NAME");
  const hostname = new URL(mongoUri).hostname;
  if (!localHosts.has(hostname))
    throw new Error(
      "Test Admin seed is restricted to a local MongoDB host; use the audited bootstrap flow for staging.",
    );
  if (!/(^|[_-])(dev|test)([_-]|$)/i.test(databaseName))
    throw new Error(
      "Test Admin seed requires a development/test database name.",
    );

  const fullName = process.env.TEST_ADMIN_FULL_NAME ?? "Test Admin";
  const email = process.env.TEST_ADMIN_EMAIL ?? "admin.test@example.test";
  const password = required("TEST_ADMIN_PASSWORD");
  let connected = false;
  try {
    await mongoose.connect(mongoUri, {
      dbName: databaseName,
      autoIndex: false,
      serverSelectionTimeoutMS: 5_000,
      appName: "paniverse-lms-test-admin-seed",
    });
    const hello = await mongoose.connection.db?.admin().command({ hello: 1 });
    if (!hello?.setName)
      throw new Error("MongoDB replica set is required for Admin seed.");
    connected = true;
    const result = await createInitialAdmin({
      fullName,
      email,
      password,
      operator: "local-test-seed",
      approvalTicket: "local-test-seed",
    });
    console.log(
      JSON.stringify({
        status: "TEST_ADMIN_CREATED",
        databaseName,
        userId: result.userId,
        email: result.email,
      }),
    );
  } finally {
    if (connected) await mongoose.disconnect();
  }
}

void main().catch((error: unknown) => {
  if (error instanceof AdminBootstrapError || error instanceof Error)
    console.error(error.message);
  else console.error("Test Admin seed failed.");
  process.exitCode = 1;
});
