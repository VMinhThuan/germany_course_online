import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import type { MediaMigrationManifest } from "./manifest.js";
import { manifestDigest } from "./manifest.js";
import type { MigrationReportItem, MigrationStatus } from "./workflow.js";

const safeReason = z
  .string()
  .max(240)
  .refine((value) => !/https?:\/\/|api_secret|signature=/i.test(value));
const resultSchema = z.strictObject({
  assetId: z.string().regex(/^[a-fA-F0-9]{24}$/),
  sourcePublicId: z
    .string()
    .min(1)
    .max(500)
    .regex(/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/),
  targetPublicId: z
    .string()
    .min(1)
    .max(500)
    .regex(/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/),
  status: z.enum(["MISSING", "MATCHED", "CONFLICT", "BLOCKED", "UNKNOWN"]),
  copiedThisRun: z.boolean().default(false),
  copiedDuringMigration: z.boolean().default(false),
  sourceStatus: z.enum(["PRESENT", "MISSING", "UNKNOWN"]),
  targetStatus: z.enum(["PRESENT", "MISSING", "UNKNOWN"]),
  bytes: z.number().int().min(1),
  sha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  reason: safeReason.optional(),
});

const journalSchema = z.strictObject({
  schemaVersion: z.literal(1),
  generatedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  sourceCloudName: z.string().regex(/^[A-Za-z0-9_-]{1,120}$/),
  targetCloudName: z.string().regex(/^[A-Za-z0-9_-]{1,120}$/),
  manifestSha256: z.string().regex(/^[a-f0-9]{64}$/),
  results: z.array(resultSchema),
});

export type MigrationJournal = z.infer<typeof journalSchema>;

export function createJournal(
  manifest: MediaMigrationManifest,
  targetCloudName: string,
  results: MigrationReportItem[] = [],
  generatedAt = new Date(),
): MigrationJournal {
  return journalSchema.parse({
    schemaVersion: 1,
    generatedAt: generatedAt.toISOString(),
    updatedAt: generatedAt.toISOString(),
    sourceCloudName: manifest.sourceCloudName,
    targetCloudName,
    manifestSha256: manifestDigest(manifest),
    results,
  });
}

export function parseJournal(value: unknown): MigrationJournal {
  return journalSchema.parse(value);
}

export async function readJournal(path: string): Promise<MigrationJournal> {
  let value: unknown;
  try {
    value = JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch {
    throw new Error("Migration journal could not be read as JSON.");
  }
  return parseJournal(value);
}

export function assertJournalMatches(
  journal: MigrationJournal,
  manifest: MediaMigrationManifest,
  targetCloudName: string,
): void {
  if (
    journal.manifestSha256 !== manifestDigest(manifest) ||
    journal.sourceCloudName !== manifest.sourceCloudName ||
    journal.targetCloudName !== targetCloudName
  ) {
    throw new Error(
      "Migration journal does not match the manifest and selected target.",
    );
  }
  const manifestItems = new Map(
    manifest.items.map((item) => [item.assetId, item.sourcePublicId]),
  );
  const seen = new Set<string>();
  for (const result of journal.results) {
    if (
      seen.has(result.assetId) ||
      manifestItems.get(result.assetId) !== result.sourcePublicId ||
      result.targetPublicId !== result.sourcePublicId
    ) {
      throw new Error(
        "Migration journal contains results outside the manifest inventory.",
      );
    }
    seen.add(result.assetId);
  }
}

export async function writeJournalAtomic(
  path: string,
  journal: MigrationJournal,
): Promise<void> {
  return writeJsonAtomic(path, journal);
}

export async function writeJsonAtomic(
  path: string,
  value: unknown,
): Promise<void> {
  const absolutePath = resolve(path);
  const directory = dirname(absolutePath);
  await mkdir(directory, { recursive: true });
  const temporary = `${absolutePath}.${process.pid}.${Date.now()}.tmp`;
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    await handle.sync();
  } catch (error) {
    await handle.close();
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
  await handle.close();
  await rename(temporary, absolutePath);
}

export async function writeExclusiveJson(
  path: string,
  value: unknown,
): Promise<void> {
  const absolutePath = resolve(path);
  await mkdir(dirname(absolutePath), { recursive: true });
  const handle = await open(absolutePath, "wx", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export type JournalResultStatus = MigrationStatus;
