import "dotenv/config";
import { stdin, stdout } from "node:process";
import { URL } from "node:url";
import { createInterface } from "node:readline/promises";
import mongoose from "mongoose";
import { parseEnvironment } from "../src/config/env.js";
import {
  ReleaseAuthorizationError,
  validateProductionTargetAuthorization,
} from "../src/config/release-authorization.js";
import {
  AdminBootstrapError,
  createAdminAccount,
} from "../src/modules/admin/admin-bootstrap.js";
import { User } from "../src/db/models/index.js";

type Options = {
  allowProduction: boolean;
  apply: boolean;
  targetDatabase?: string;
  confirmedHosts?: string;
  confirmedReplicaSet?: string;
  backupCheckpoint?: string;
  approvalTicket?: string;
  help: boolean;
};

const flagOptions = new Set(["--allow-production", "--apply", "--help"]);
const valueOptions = new Set([
  "--target-db",
  "--confirm-host",
  "--confirm-replica-set",
  "--backup-checkpoint",
  "--operator-ticket",
]);

function printHelp(): void {
  console.log(`Production Admin bootstrap (interactive; never runs during deploy)

Required flags:
  --allow-production
  --apply
  --target-db=<exact MONGODB_DB_NAME>
  --confirm-host=<sorted MongoDB host list, without credentials>
  --confirm-replica-set=<exact replica set name>
  --backup-checkpoint=<non-secret backup/checkpoint id>
  --operator-ticket=<approved change/ticket id>

The command displays the resolved target, requires typing CREATE PRODUCTION ADMIN,
then asks for Admin name, email and hidden password input.
`);
}

function parseOptions(args: string[]): Options {
  const values = new Map<string, string>();
  let help = false;
  for (const argument of args) {
    const [name, ...rest] = argument.split("=");
    if (name === "--help") {
      if (rest.length > 0)
        throw new ReleaseAuthorizationError("--help does not accept a value.");
      help = true;
      continue;
    }
    if (!name || (!flagOptions.has(name) && !valueOptions.has(name)))
      throw new ReleaseAuthorizationError(
        `Unknown Production Admin option: ${name ?? ""}`,
      );
    if (values.has(name))
      throw new ReleaseAuthorizationError(`Duplicate option: ${name}`);
    if (flagOptions.has(name)) {
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
    allowProduction: values.has("--allow-production"),
    apply: values.has("--apply"),
    targetDatabase: values.get("--target-db"),
    confirmedHosts: values.get("--confirm-host"),
    confirmedReplicaSet: values.get("--confirm-replica-set"),
    backupCheckpoint: values.get("--backup-checkpoint"),
    approvalTicket: values.get("--operator-ticket"),
    help,
  };
}

async function promptText(message: string): Promise<string> {
  const reader = createInterface({ input: stdin, output: stdout });
  try {
    return (await reader.question(message)).trim();
  } finally {
    reader.close();
  }
}

async function promptSecret(message: string): Promise<string> {
  if (!stdin.isTTY || !stdout.isTTY)
    throw new ReleaseAuthorizationError(
      "Production Admin bootstrap requires an interactive terminal for hidden password input.",
    );

  stdout.write(message);
  stdin.setRawMode(true);
  stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    const onData = (chunk: Buffer | string) => {
      for (const character of chunk.toString()) {
        if (character === "\u0003") {
          cleanup();
          stdout.write("\n");
          reject(new ReleaseAuthorizationError("Password input cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          cleanup();
          stdout.write("\n");
          resolve(value);
          return;
        }
        if (character === "\u007f") value = value.slice(0, -1);
        else value += character;
      }
    };
    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
    };
    stdin.on("data", onData);
  });
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (!options.allowProduction || !options.apply)
    throw new ReleaseAuthorizationError(
      "Production creation requires both --allow-production and --apply.",
    );
  if (!options.approvalTicket)
    throw new ReleaseAuthorizationError("--operator-ticket is required.");

  const config = parseEnvironment(process.env);
  const target = validateProductionTargetAuthorization(config, {
    allowProduction: options.allowProduction,
    targetDatabase: options.targetDatabase,
    confirmedHosts: options.confirmedHosts,
    confirmedReplicaSet: options.confirmedReplicaSet,
    backupCheckpoint: options.backupCheckpoint,
  });
  if (!stdin.isTTY || !stdout.isTTY)
    throw new ReleaseAuthorizationError(
      "Production Admin bootstrap must be run from an interactive terminal.",
    );

  const hostname = new URL(config.mongoUri).hostname;
  console.log("\nPRODUCTION ADMIN BOOTSTRAP TARGET");
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Database: ${target.expectedDatabase}`);
  console.log(`Host: ${hostname}`);
  console.log(`Confirmed hosts: ${target.expectedHosts.join(",")}`);
  console.log("Credentials are not displayed.\n");

  const confirmation = await promptText(
    "Type CREATE PRODUCTION ADMIN to continue: ",
  );
  if (confirmation !== "CREATE PRODUCTION ADMIN")
    throw new ReleaseAuthorizationError("Production Admin creation cancelled.");

  let connected = false;
  try {
    await mongoose.connect(config.mongoUri, {
      dbName: config.databaseName,
      autoIndex: false,
      serverSelectionTimeoutMS: 5_000,
      appName: "paniverse-lms-production-admin-bootstrap",
    });
    connected = true;
    const database = mongoose.connection.db;
    if (!database || database.databaseName !== config.databaseName)
      throw new ReleaseAuthorizationError(
        "Connected MongoDB database does not match MONGODB_DB_NAME.",
      );
    const hello = await database.admin().command({ hello: 1 });
    if (hello.setName !== options.confirmedReplicaSet)
      throw new ReleaseAuthorizationError(
        "Connected replica set does not match --confirm-replica-set.",
      );

    const fullName = await promptText("Admin full name: ");
    const email = (await promptText("Admin email: ")).toLowerCase();
    const existing = await User.exists({ email });
    if (existing)
      throw new AdminBootstrapError(
        "An account with this email already exists; no account was changed.",
      );
    const password = await promptSecret("Admin password (hidden): ");
    const passwordConfirmation = await promptSecret(
      "Confirm Admin password (hidden): ",
    );
    if (password !== passwordConfirmation)
      throw new AdminBootstrapError(
        "Passwords do not match; no account was created.",
      );
    const operator =
      process.env.ADMIN_BOOTSTRAP_OPERATOR?.trim() ||
      (await promptText("Operator name/email: "));

    const result = await createAdminAccount({
      fullName,
      email,
      password,
      operator,
      approvalTicket: options.approvalTicket,
    });
    console.log(
      JSON.stringify({
        status: "PRODUCTION_ADMIN_CREATED",
        environment: config.nodeEnv,
        databaseName: database.databaseName,
        replicaSetName: hello.setName,
        userId: result.userId,
        email: result.email,
        auditAction: "ADMIN_CREATED",
      }),
    );
  } finally {
    if (connected) await mongoose.disconnect();
  }
}

function safeFailureMessage(error: unknown): string {
  if (!(error instanceof Error))
    return "Production Admin bootstrap failed; credentials and connection details were not logged.";
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";
  const message = error.message.replace(
    /mongodb(?:\+srv)?:\/\/[^@\s]+@/gi,
    "mongodb://[redacted]@",
  );
  return `Production Admin bootstrap failed${code ? ` [${code}]` : ""}: ${message}`;
}

void main().catch((error: unknown) => {
  if (
    error instanceof ReleaseAuthorizationError ||
    error instanceof AdminBootstrapError
  )
    console.error(error.message);
  else console.error(safeFailureMessage(error));
  process.exitCode = 1;
});
