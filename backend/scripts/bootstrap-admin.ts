import "dotenv/config";
import { parseEnvironment } from "../src/config/env.js";
import {
  ReleaseAuthorizationError,
  validateStagingTargetAuthorization,
} from "../src/config/release-authorization.js";
import { connectMongo, disconnectMongo } from "../src/db/connection.js";
import mongoose from "mongoose";
import {
  AdminBootstrapError,
  createInitialAdmin,
} from "../src/modules/admin/admin-bootstrap.js";

type Options = {
  apply: boolean;
  createInitialAdmin: boolean;
  targetDatabase: string | undefined;
  confirmedHosts: string | undefined;
  confirmedReplicaSet: string | undefined;
  backupCheckpoint: string | undefined;
  approvalTicket: string | undefined;
};

const optionNames = new Set([
  "--apply",
  "--create-initial-admin",
  "--target-db",
  "--confirm-host",
  "--confirm-replica-set",
  "--backup-checkpoint",
  "--operator-ticket",
]);

function parseOptions(args: string[]): Options {
  const values = new Map<string, string>();
  for (const argument of args) {
    const [name, ...rest] = argument.split("=");
    if (!name || !optionNames.has(name))
      throw new ReleaseAuthorizationError("Unknown Admin bootstrap option.");
    if (values.has(name))
      throw new ReleaseAuthorizationError("Duplicate Admin bootstrap option.");
    if (name === "--apply" || name === "--create-initial-admin") {
      if (rest.length > 0)
        throw new ReleaseAuthorizationError(`${name} does not accept a value.`);
      values.set(name, "true");
      continue;
    }
    const value = rest.join("=").trim();
    if (!value)
      throw new ReleaseAuthorizationError(`${name} requires a value.`);
    values.set(name, value);
  }
  return {
    apply: values.has("--apply"),
    createInitialAdmin: values.has("--create-initial-admin"),
    targetDatabase: values.get("--target-db"),
    confirmedHosts: values.get("--confirm-host"),
    confirmedReplicaSet: values.get("--confirm-replica-set"),
    backupCheckpoint: values.get("--backup-checkpoint"),
    approvalTicket: values.get("--operator-ticket"),
  };
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  if (!options.apply || !options.createInitialAdmin)
    throw new ReleaseAuthorizationError(
      "Admin creation requires both --apply and --create-initial-admin.",
    );
  if (!options.approvalTicket)
    throw new ReleaseAuthorizationError(
      "--operator-ticket is required for the audit record.",
    );

  const config = parseEnvironment(process.env);
  validateStagingTargetAuthorization(config, {
    targetDatabase: options.targetDatabase,
    confirmedHosts: options.confirmedHosts,
    confirmedReplicaSet: options.confirmedReplicaSet,
    backupCheckpoint: options.backupCheckpoint,
  });

  const fullName = process.env.ADMIN_BOOTSTRAP_FULL_NAME;
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const operator = process.env.ADMIN_BOOTSTRAP_OPERATOR;
  delete process.env.ADMIN_BOOTSTRAP_FULL_NAME;
  delete process.env.ADMIN_BOOTSTRAP_EMAIL;
  delete process.env.ADMIN_BOOTSTRAP_PASSWORD;
  delete process.env.ADMIN_BOOTSTRAP_OPERATOR;

  if (!fullName || !email || !password || !operator)
    throw new ReleaseAuthorizationError(
      "ADMIN_BOOTSTRAP_FULL_NAME, ADMIN_BOOTSTRAP_EMAIL, ADMIN_BOOTSTRAP_PASSWORD, and ADMIN_BOOTSTRAP_OPERATOR must be provided through the approved secret/configuration channel.",
    );

  let connected = false;
  try {
    await connectMongo(config);
    connected = true;
    const database = mongoose.connection.db;
    if (!database || database.databaseName !== config.databaseName) {
      throw new ReleaseAuthorizationError(
        "Connected MongoDB database does not match MONGODB_DB_NAME.",
      );
    }
    const hello = await database.admin().command({ hello: 1 });
    if (hello.setName !== options.confirmedReplicaSet) {
      throw new ReleaseAuthorizationError(
        "Connected replica set does not match --confirm-replica-set.",
      );
    }

    const result = await createInitialAdmin({
      fullName,
      email,
      password,
      operator,
      approvalTicket: options.approvalTicket,
    });
    console.log(
      JSON.stringify({
        status: "INITIAL_ADMIN_CREATED",
        databaseName: database.databaseName,
        replicaSetName: hello.setName,
        userId: result.userId,
        email: result.email,
        auditAction: "ADMIN_BOOTSTRAPPED",
        bootstrapMarker: "initial-admin",
      }),
    );
  } finally {
    if (connected) await disconnectMongo();
  }
}

void main().catch((error: unknown) => {
  if (
    error instanceof ReleaseAuthorizationError ||
    error instanceof AdminBootstrapError
  ) {
    console.error(error.message);
  } else {
    console.error(
      `Admin bootstrap failed (${error instanceof Error ? error.name : "UnknownError"}); passwords and connection strings are not logged.`,
    );
  }
  process.exitCode = 1;
});
