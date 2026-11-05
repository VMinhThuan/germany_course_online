import { readFile } from "node:fs/promises";
import mongoose from "mongoose";
import { MediaAsset } from "../../src/db/models/index.js";
import { buildManifest, manifestDigest, readManifest } from "./manifest.js";
import {
  assertJournalMatches,
  createJournal,
  readJournal,
  writeExclusiveJson,
  writeJsonAtomic,
  writeJournalAtomic,
} from "./journal.js";
import {
  CloudinaryMigrationGateway,
  type CloudinaryMigrationCredentials,
} from "./cloudinary-gateway.js";
import {
  runMigrationCopy,
  runMigrationReadOnly,
  type MigrationReport,
  type MigrationReportItem,
  type MigrationStatus,
} from "./workflow.js";

type ParsedArgs = { command: string; flags: Map<string, string | true> };

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  switch (args.command) {
    case "export-manifest":
      await exportManifest(args.flags);
      return;
    case "validate-manifest":
      await validateManifestFile(args.flags);
      return;
    case "preflight":
    case "dry-run":
    case "verify":
      await runReadOnlyCommand(args.command, args.flags);
      return;
    case "copy":
    case "resume":
      await runCopyCommand(args.command, args.flags);
      return;
    case "report":
      await showReport(args.flags);
      return;
    default:
      throw new Error("Unknown media migration command.");
  }
}

async function exportManifest(
  flags: Map<string, string | true>,
): Promise<void> {
  rejectUnknownFlags(flags, ["out"]);
  const output = requiredString(flags, "out");
  const cloudName = requiredEnv("CLOUDINARY_CLOUD_NAME");
  const uri = requiredEnv("MONGODB_URI");
  const databaseName = requiredEnv("MONGODB_DB_NAME");
  try {
    await mongoose.connect(uri, { dbName: databaseName, autoIndex: false });
    const rows = await MediaAsset.find({})
      .select(
        "+provider +storageKey +resourceType +deliveryType +providerAssetId originalName mediaType mimeType fileSize format uploadStatus deletedAt",
      )
      .lean();
    const manifest = buildManifest(
      rows as unknown as Record<string, unknown>[],
      cloudName,
    );
    await writeExclusiveJson(output, manifest);
    console.log(
      JSON.stringify({
        command: "export-manifest",
        output,
        sourceCloudName: cloudName,
        included: manifest.items.length,
        exclusions: manifest.exclusions,
      }),
    );
  } finally {
    await mongoose.disconnect();
  }
}

async function validateManifestFile(
  flags: Map<string, string | true>,
): Promise<void> {
  rejectUnknownFlags(flags, ["manifest"]);
  const manifest = await readManifest(requiredString(flags, "manifest"));
  console.log(
    JSON.stringify({
      command: "validate-manifest",
      valid: true,
      sourceCloudName: manifest.sourceCloudName,
      items: manifest.items.length,
      manifestSha256: manifestDigest(manifest),
      exclusions: manifest.exclusions,
    }),
  );
}

async function runReadOnlyCommand(
  command: "preflight" | "dry-run" | "verify",
  flags: Map<string, string | true>,
): Promise<void> {
  rejectUnknownFlags(flags, ["manifest", "report", "concurrency", "retries"]);
  const manifest = await readManifest(requiredString(flags, "manifest"));
  const { source, target } = accounts();
  const report = await runMigrationReadOnly(manifest, source, target, command, {
    mode: command,
    concurrency: integerFlag(flags, "concurrency", 2, 1, 8),
    retryCount: integerFlag(flags, "retries", 2, 0, 5),
  });
  await outputReport(flags, report);
  printSummary(report);
}

async function runCopyCommand(
  command: "copy" | "resume",
  flags: Map<string, string | true>,
): Promise<void> {
  rejectUnknownFlags(flags, [
    "manifest",
    "journal",
    "report",
    "concurrency",
    "retries",
    "apply",
    "confirm-target",
  ]);
  if (flags.get("apply") !== true)
    throw new Error("Copy and resume require the explicit --apply flag.");
  const manifest = await readManifest(requiredString(flags, "manifest"));
  const { source, target } = accounts();
  const confirmation = requiredString(flags, "confirm-target");
  if (confirmation !== target.cloudName)
    throw new Error(
      "The confirmed target does not match the configured target account.",
    );
  const journalPath = requiredString(flags, "journal");
  const previousJournal =
    command === "resume" ? await readJournal(journalPath) : undefined;
  if (previousJournal)
    assertJournalMatches(previousJournal, manifest, target.cloudName);
  const progress = new Map<string, MigrationReportItem>(
    previousJournal?.results.map((result) => [result.assetId, result]) ?? [],
  );
  let journal = createJournal(manifest, target.cloudName, [
    ...progress.values(),
  ]);
  await writeJournalAtomic(journalPath, journal);
  let queuedWrite = Promise.resolve();
  const report = await runMigrationCopy(
    manifest,
    source,
    target,
    {
      mode: command,
      concurrency: integerFlag(flags, "concurrency", 1, 1, 8),
      retryCount: integerFlag(flags, "retries", 2, 0, 5),
      onResult: (result) => {
        progress.set(result.assetId, result);
        journal = createJournal(manifest, target.cloudName, [
          ...progress.values(),
        ]);
        queuedWrite = queuedWrite.then(() =>
          writeJournalAtomic(journalPath, journal),
        );
        return queuedWrite;
      },
    },
    progress,
  );
  await queuedWrite;
  await outputReport(flags, report);
  printSummary(report);
}

async function showReport(flags: Map<string, string | true>): Promise<void> {
  rejectUnknownFlags(flags, ["report"]);
  let parsed: unknown;
  try {
    parsed = JSON.parse(
      await readFile(requiredString(flags, "report"), "utf8"),
    ) as unknown;
  } catch {
    throw new Error("Report could not be read as JSON.");
  }
  const report = validateReport(parsed);
  printSummary(report);
}

function accounts(): {
  source: CloudinaryMigrationGateway;
  target: CloudinaryMigrationGateway;
} {
  const sourceCredentials = credentials("CLOUDINARY", "CLOUDINARY_FOLDER_MODE");
  const targetCredentials = credentials(
    "MEDIA_MIGRATION_TARGET_CLOUDINARY",
    "MEDIA_MIGRATION_TARGET_FOLDER_MODE",
  );
  return {
    source: new CloudinaryMigrationGateway(sourceCredentials),
    target: new CloudinaryMigrationGateway(targetCredentials),
  };
}

function credentials(
  prefix: string,
  folderModeName: string,
): CloudinaryMigrationCredentials {
  const cloudName = requiredEnv(`${prefix}_CLOUD_NAME`);
  const apiKey = requiredEnv(`${prefix}_API_KEY`);
  const apiSecret = requiredEnv(`${prefix}_API_SECRET`);
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(cloudName))
    throw new Error("Cloudinary account configuration is invalid.");
  const folderMode = process.env[folderModeName] ?? "dynamic";
  if (folderMode !== "fixed" && folderMode !== "dynamic")
    throw new Error("Cloudinary folder mode is invalid.");
  return { cloudName, apiKey, apiSecret, folderMode };
}

function validateReport(value: unknown): MigrationReport {
  const status = [
    "MISSING",
    "MATCHED",
    "CONFLICT",
    "BLOCKED",
    "UNKNOWN",
  ] as const;
  const safeText = (text: unknown) =>
    typeof text === "string" &&
    text.length <= 240 &&
    !/https?:\/\/|api_secret|signature=/i.test(text);
  if (!value || typeof value !== "object")
    throw new Error("Report shape is invalid.");
  const input = value as Record<string, unknown>;
  if (
    input.schemaVersion !== 1 ||
    !["preflight", "dry-run", "copy", "resume", "verify"].includes(
      String(input.mode),
    ) ||
    !/^[A-Za-z0-9_-]{1,120}$/.test(String(input.sourceCloudName)) ||
    !/^[A-Za-z0-9_-]{1,120}$/.test(String(input.targetCloudName)) ||
    !/^[a-f0-9]{64}$/.test(String(input.manifestSha256)) ||
    typeof input.generatedAt !== "string" ||
    typeof input.totals !== "object" ||
    input.totals === null ||
    !Array.isArray(input.results) ||
    !Number.isInteger(input.copiedCount) ||
    !Number.isInteger(input.alreadyMatchedCount) ||
    !Number.isInteger(input.verifiedCount) ||
    !Number.isInteger(input.failedCount) ||
    !Number.isInteger(input.conflictCount) ||
    !Number.isInteger(input.missingCount) ||
    typeof input.cutoverReady !== "boolean" ||
    typeof input.bytesPlanned !== "number" ||
    typeof input.bytesCopied !== "number" ||
    !Number.isInteger(input.estimatedProviderRequests) ||
    (input.estimatedProviderRequests as number) < 0
  )
    throw new Error("Report shape is invalid.");
  const totals = input.totals as Record<string, unknown>;
  const parsedTotals = {} as Record<MigrationStatus, number>;
  for (const value of status) {
    if (!Number.isInteger(totals[value]))
      throw new Error("Report totals are invalid.");
    parsedTotals[value] = totals[value] as number;
  }
  const results = input.results.map((raw): MigrationReportItem => {
    if (!raw || typeof raw !== "object")
      throw new Error("Report result is invalid.");
    const item = raw as Record<string, unknown>;
    if (
      !/^[a-fA-F0-9]{24}$/.test(String(item.assetId)) ||
      !/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(
        String(item.sourcePublicId),
      ) ||
      item.targetPublicId !== item.sourcePublicId ||
      !status.includes(item.status as (typeof status)[number]) ||
      typeof item.copiedThisRun !== "boolean" ||
      typeof item.copiedDuringMigration !== "boolean" ||
      !["PRESENT", "MISSING", "UNKNOWN"].includes(String(item.sourceStatus)) ||
      !["PRESENT", "MISSING", "UNKNOWN"].includes(String(item.targetStatus)) ||
      typeof item.bytes !== "number" ||
      (item.sha256 !== undefined &&
        !/^[a-f0-9]{64}$/.test(String(item.sha256))) ||
      (item.reason !== undefined && !safeText(item.reason))
    )
      throw new Error("Report result is invalid or contains unsafe content.");
    return item as unknown as MigrationReportItem;
  });
  return {
    ...(input as unknown as MigrationReport),
    totals: parsedTotals,
    results,
  };
}

async function outputReport(
  flags: Map<string, string | true>,
  report: MigrationReport,
): Promise<void> {
  const output = flags.get("report");
  if (typeof output === "string") await writeJsonAtomic(output, report);
}

function printSummary(report: MigrationReport): void {
  console.log(
    JSON.stringify({
      mode: report.mode,
      sourceCloudName: report.sourceCloudName,
      targetCloudName: report.targetCloudName,
      manifestSha256: report.manifestSha256,
      totals: report.totals,
      copiedCount: report.copiedCount,
      alreadyMatchedCount: report.alreadyMatchedCount,
      verifiedCount: report.verifiedCount,
      failedCount: report.failedCount,
      conflictCount: report.conflictCount,
      missingCount: report.missingCount,
      cutoverReady: report.cutoverReady,
      bytesPlanned: report.bytesPlanned,
      bytesCopied: report.bytesCopied,
      estimatedProviderRequests: report.estimatedProviderRequests,
      results: report.results.map(
        ({ assetId, status, sourceStatus, targetStatus, bytes, reason }) => ({
          assetId,
          status,
          sourceStatus,
          targetStatus,
          bytes,
          ...(reason ? { reason } : {}),
        }),
      ),
    }),
  );
}

function parseArgs(argv: string[]): ParsedArgs {
  const command = argv[0] ?? "";
  const flags = new Map<string, string | true>();
  for (const raw of argv.slice(1)) {
    if (!raw.startsWith("--"))
      throw new Error("Unexpected positional argument.");
    const [name, ...parts] = raw.slice(2).split("=");
    if (!name || flags.has(name))
      throw new Error("Unknown or duplicate command flag.");
    flags.set(name, parts.length ? parts.join("=") : true);
  }
  return { command, flags };
}

function rejectUnknownFlags(
  flags: Map<string, string | true>,
  allowed: string[],
): void {
  for (const name of flags.keys())
    if (!allowed.includes(name)) throw new Error("Unknown command flag.");
}

function requiredString(
  flags: Map<string, string | true>,
  name: string,
): string {
  const value = flags.get(name);
  if (typeof value !== "string" || !value.trim())
    throw new Error(`Command requires --${name}=VALUE.`);
  return value;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value)
    throw new Error(`Required environment configuration is missing: ${name}.`);
  return value;
}

function integerFlag(
  flags: Map<string, string | true>,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const value = flags.get(name);
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value))
    throw new Error(`--${name} must be an integer.`);
  const number = Number(value);
  if (number < minimum || number > maximum)
    throw new Error(`--${name} must be between ${minimum} and ${maximum}.`);
  return number;
}

main().catch((error: unknown) => {
  void error;
  console.error(
    "Media migration stopped safely. Review the command flags, manifest validation, local configuration, and provider availability.",
  );
  process.exitCode = 1;
});
