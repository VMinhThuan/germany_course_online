import "dotenv/config";
import mongoose from "mongoose";
import { parseEnvironment } from "../src/config/env.js";
import {
  ReleaseAuthorizationError,
  validateStagingTargetAuthorization,
} from "../src/config/release-authorization.js";
import { connectMongo, disconnectMongo } from "../src/db/connection.js";
import { ensureIndexes } from "../src/db/ensure-indexes.js";
import { createIndexPlan } from "../src/db/index-migration.js";

type Options = {
  apply: boolean;
  targetDatabase: string | undefined;
  confirmedHosts: string | undefined;
  confirmedReplicaSet: string | undefined;
  backupCheckpoint: string | undefined;
};

const optionNames = new Set([
  "--apply",
  "--target-db",
  "--confirm-host",
  "--confirm-replica-set",
  "--backup-checkpoint",
]);

function parseOptions(args: string[]): Options {
  const values = new Map<string, string>();
  for (const argument of args) {
    const [name, ...rest] = argument.split("=");
    if (!name || !optionNames.has(name))
      throw new ReleaseAuthorizationError("Unknown index migration option.");
    if (values.has(name))
      throw new ReleaseAuthorizationError("Duplicate index migration option.");
    if (name === "--apply") {
      if (rest.length > 0)
        throw new ReleaseAuthorizationError("--apply does not accept a value.");
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
    targetDatabase: values.get("--target-db"),
    confirmedHosts: values.get("--confirm-host"),
    confirmedReplicaSet: values.get("--confirm-replica-set"),
    backupCheckpoint: values.get("--backup-checkpoint"),
  };
}

function assertPlanHasNoBlockers(
  plan: Awaited<ReturnType<typeof createIndexPlan>>,
): void {
  if (!plan.canApply) {
    throw new ReleaseAuthorizationError(
      "Index plan contains conflicts, duplicate keys, or unsupported unique indexes; no index changes were applied.",
    );
  }
}

async function main(): Promise<void> {
  const config = parseEnvironment(process.env);
  const options = parseOptions(process.argv.slice(2));
  const productionAuthorization =
    config.nodeEnv === "production" && options.apply
      ? validateStagingTargetAuthorization(config, options)
      : undefined;

  if (
    config.nodeEnv !== "production" &&
    (options.targetDatabase ||
      options.confirmedHosts ||
      options.confirmedReplicaSet ||
      options.backupCheckpoint)
  ) {
    throw new ReleaseAuthorizationError(
      "Remote target confirmations are only accepted for production-semantics staging operations.",
    );
  }

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
    const replicaSetName =
      typeof hello.setName === "string" ? hello.setName : undefined;
    if (!replicaSetName) {
      throw new ReleaseAuthorizationError(
        "Connected MongoDB target is not a replica set.",
      );
    }
    if (
      productionAuthorization &&
      replicaSetName !== options.confirmedReplicaSet
    ) {
      throw new ReleaseAuthorizationError(
        "Connected replica set does not match --confirm-replica-set.",
      );
    }

    let plan = await createIndexPlan();
    console.log(
      JSON.stringify(
        {
          mode: options.apply ? "APPLY" : "PLAN_ONLY",
          target: {
            databaseName: database.databaseName,
            replicaSetName,
            ...(productionAuthorization
              ? { hosts: productionAuthorization.expectedHosts }
              : {}),
          },
          backupCheckpoint: options.apply
            ? (options.backupCheckpoint ?? "local-only-no-remote-backup")
            : undefined,
          plan,
        },
        null,
        2,
      ),
    );

    if (!options.apply) return;
    assertPlanHasNoBlockers(plan);
    await ensureIndexes();
    plan = await createIndexPlan();
    if (
      !plan.canApply ||
      plan.entries.some((entry) => entry.status === "CREATE")
    ) {
      throw new Error("Post-apply index verification did not pass.");
    }
    console.log(
      "Index verification passed; existing extra indexes were retained.",
    );
  } finally {
    if (connected) await disconnectMongo();
  }
}

void main().catch((error: unknown) => {
  if (error instanceof ReleaseAuthorizationError) {
    console.error(error.message);
  } else {
    console.error(
      `Index migration failed (${error instanceof Error ? error.name : "UnknownError"}); connection strings and database document values are not logged.`,
    );
  }
  process.exitCode = 1;
});
