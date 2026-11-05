import type { MediaMigrationItem, MediaMigrationManifest } from "./manifest.js";
import { manifestDigest } from "./manifest.js";

export type MigrationStatus =
  "MISSING" | "MATCHED" | "CONFLICT" | "BLOCKED" | "UNKNOWN";

export type ResourceMetadata = {
  publicId: string;
  resourceType: string;
  deliveryType: string;
  format: string;
  bytes: number;
};

export type ContentDigest = { sha256: string; bytes: number };

export interface MediaMigrationGateway {
  readonly cloudName: string;
  inspect(item: MediaMigrationItem): Promise<ResourceMetadata | null>;
  digest(item: MediaMigrationItem): Promise<ContentDigest>;
  copyTo?(
    item: MediaMigrationItem,
    target: MediaMigrationGateway,
  ): Promise<ContentDigest>;
}

export type MigrationReportItem = {
  assetId: string;
  sourcePublicId: string;
  targetPublicId: string;
  status: MigrationStatus;
  copiedThisRun: boolean;
  copiedDuringMigration: boolean;
  sourceStatus: "PRESENT" | "MISSING" | "UNKNOWN";
  targetStatus: "PRESENT" | "MISSING" | "UNKNOWN";
  bytes: number;
  sha256?: string | undefined;
  reason?: string | undefined;
};

export type MigrationReport = {
  schemaVersion: 1;
  mode: "preflight" | "dry-run" | "copy" | "resume" | "verify";
  generatedAt: string;
  sourceCloudName: string;
  targetCloudName: string;
  manifestSha256: string;
  totals: Record<MigrationStatus, number>;
  copiedCount: number;
  alreadyMatchedCount: number;
  verifiedCount: number;
  failedCount: number;
  conflictCount: number;
  missingCount: number;
  cutoverReady: boolean;
  bytesPlanned: number;
  bytesCopied: number;
  estimatedProviderRequests: number;
  results: MigrationReportItem[];
};

type Options = {
  concurrency?: number;
  retryCount?: number;
  mode: MigrationReport["mode"];
  onResult?: (result: MigrationReportItem) => Promise<void> | void;
};

export async function runMigrationReadOnly(
  manifest: MediaMigrationManifest,
  source: MediaMigrationGateway,
  target: MediaMigrationGateway,
  mode: "preflight" | "dry-run" | "verify",
  options: Options = { mode },
): Promise<MigrationReport> {
  assertAccounts(manifest, source, target);
  const results = await mapLimit(
    manifest.items,
    options.concurrency ?? 2,
    async (item) => {
      const result = await retry(
        async () => inspectOne(item, source, target, mode === "verify"),
        options.retryCount ?? 2,
      );
      await options.onResult?.(result);
      return result;
    },
  );
  return makeReport(manifest, source, target, mode, results);
}

export async function runMigrationCopy(
  manifest: MediaMigrationManifest,
  source: MediaMigrationGateway,
  target: MediaMigrationGateway,
  options: Options & { mode: "copy" | "resume" },
  previous?: ReadonlyMap<string, MigrationReportItem>,
): Promise<MigrationReport> {
  assertAccounts(manifest, source, target);
  if (!source.copyTo)
    throw new Error(
      "The configured source account cannot stream assets to the target.",
    );
  const results = await mapLimit(
    manifest.items,
    options.concurrency ?? 1,
    async (item) => {
      const earlier = previous?.get(item.assetId);
      if (earlier?.status === "MATCHED") {
        const verified = await retry(
          () => inspectOne(item, source, target, true),
          options.retryCount ?? 2,
        );
        if (verified.status === "MATCHED") {
          const result = {
            ...verified,
            copiedThisRun: false,
            copiedDuringMigration: earlier.copiedDuringMigration,
          };
          await options.onResult?.(result);
          return result;
        }
      }
      const result = await retry(
        () => copyAndVerify(item, source, target),
        options.retryCount ?? 2,
      );
      await options.onResult?.(result);
      return result;
    },
  );
  return makeReport(manifest, source, target, options.mode, results);
}

export async function inspectOne(
  item: MediaMigrationItem,
  source: MediaMigrationGateway,
  target: MediaMigrationGateway,
  verifyBytes: boolean,
): Promise<MigrationReportItem> {
  let sourceMetadata: ResourceMetadata | null;
  try {
    sourceMetadata = await source.inspect(item);
  } catch {
    return baseResult(
      item,
      "UNKNOWN",
      "UNKNOWN",
      "UNKNOWN",
      "Source metadata could not be read.",
    );
  }
  if (!sourceMetadata)
    return baseResult(
      item,
      "MISSING",
      "MISSING",
      "UNKNOWN",
      "Source resource is missing.",
    );
  const sourceReason = metadataMismatch(item, sourceMetadata);
  if (sourceReason)
    return baseResult(item, "BLOCKED", "PRESENT", "UNKNOWN", sourceReason);

  let targetMetadata: ResourceMetadata | null;
  try {
    targetMetadata = await target.inspect(item);
  } catch {
    return baseResult(
      item,
      "UNKNOWN",
      "PRESENT",
      "UNKNOWN",
      "Target metadata could not be read.",
    );
  }
  if (!targetMetadata)
    return baseResult(
      item,
      "MISSING",
      "PRESENT",
      "MISSING",
      "Target resource is missing.",
    );
  const targetReason = metadataMismatch(item, targetMetadata);
  if (targetReason)
    return baseResult(
      item,
      "BLOCKED",
      "PRESENT",
      "PRESENT",
      `Target metadata is incompatible: ${targetReason}`,
    );
  if (!verifyBytes)
    return baseResult(
      item,
      "UNKNOWN",
      "PRESENT",
      "PRESENT",
      "Both resources exist; byte hashes are required to confirm a match.",
    );

  const [sourceDigest, targetDigest] = await Promise.all([
    retry(() => source.digest(item), 2),
    retry(() => target.digest(item), 2),
  ]);
  if (
    sourceDigest.bytes !== item.fileSize ||
    targetDigest.bytes !== item.fileSize
  )
    return baseResult(
      item,
      "CONFLICT",
      "PRESENT",
      "PRESENT",
      "Verified byte count does not match the manifest.",
    );
  if (sourceDigest.sha256 !== targetDigest.sha256)
    return baseResult(
      item,
      "CONFLICT",
      "PRESENT",
      "PRESENT",
      "Source and target SHA-256 digests differ.",
    );
  return {
    ...baseResult(item, "MATCHED", "PRESENT", "PRESENT"),
    sha256: sourceDigest.sha256,
  };
}

async function copyAndVerify(
  item: MediaMigrationItem,
  source: MediaMigrationGateway,
  target: MediaMigrationGateway,
): Promise<MigrationReportItem> {
  const existing = await inspectOne(item, source, target, true);
  if (existing.status !== "MISSING" || existing.targetStatus !== "MISSING")
    return existing;
  let transferred: ContentDigest;
  try {
    transferred = await source.copyTo!(item, target);
  } catch {
    return baseResult(
      item,
      "UNKNOWN",
      "PRESENT",
      "UNKNOWN",
      "Streamed copy did not complete; target was not overwritten.",
    );
  }
  if (transferred.bytes !== item.fileSize)
    return baseResult(
      item,
      "CONFLICT",
      "PRESENT",
      "PRESENT",
      "Streamed byte count did not match the manifest.",
    );
  let targetMetadata: ResourceMetadata | null;
  try {
    targetMetadata = await target.inspect(item);
  } catch {
    return baseResult(
      item,
      "UNKNOWN",
      "PRESENT",
      "UNKNOWN",
      "Target metadata could not be verified after upload.",
    );
  }
  if (!targetMetadata)
    return baseResult(
      item,
      "UNKNOWN",
      "PRESENT",
      "MISSING",
      "Target upload is not visible yet.",
    );
  const mismatch = metadataMismatch(item, targetMetadata);
  if (mismatch)
    return baseResult(
      item,
      "BLOCKED",
      "PRESENT",
      "PRESENT",
      `Target verification failed: ${mismatch}`,
    );
  let targetDigest: ContentDigest;
  try {
    targetDigest = await target.digest(item);
  } catch {
    return baseResult(
      item,
      "UNKNOWN",
      "PRESENT",
      "PRESENT",
      "Target bytes could not be verified.",
    );
  }
  if (
    targetDigest.bytes !== item.fileSize ||
    transferred.sha256 !== targetDigest.sha256
  ) {
    return baseResult(
      item,
      "CONFLICT",
      "PRESENT",
      "PRESENT",
      "Source and target SHA-256 digests differ after copy.",
    );
  }
  return {
    ...baseResult(item, "MATCHED", "PRESENT", "PRESENT"),
    copiedThisRun: true,
    copiedDuringMigration: true,
    sha256: transferred.sha256,
  };
}

function metadataMismatch(
  item: MediaMigrationItem,
  metadata: ResourceMetadata,
): string | null {
  if (metadata.publicId !== item.sourcePublicId)
    return "Public ID does not match the manifest.";
  if (metadata.resourceType !== item.resourceType)
    return "Resource type does not match the manifest.";
  if (metadata.deliveryType !== "authenticated")
    return "Delivery type is not authenticated.";
  if (metadata.format.toLowerCase() !== item.format.toLowerCase())
    return "Format does not match the manifest.";
  if (metadata.bytes !== item.fileSize)
    return "Provider byte count does not match the manifest.";
  return null;
}

function baseResult(
  item: MediaMigrationItem,
  status: MigrationStatus,
  sourceStatus: MigrationReportItem["sourceStatus"],
  targetStatus: MigrationReportItem["targetStatus"],
  reason?: string,
): MigrationReportItem {
  return {
    assetId: item.assetId,
    sourcePublicId: item.sourcePublicId,
    targetPublicId: item.sourcePublicId,
    status,
    copiedThisRun: false,
    copiedDuringMigration: false,
    sourceStatus,
    targetStatus,
    bytes: item.fileSize,
    ...(reason ? { reason } : {}),
  };
}

function makeReport(
  manifest: MediaMigrationManifest,
  source: MediaMigrationGateway,
  target: MediaMigrationGateway,
  mode: MigrationReport["mode"],
  results: MigrationReportItem[],
): MigrationReport {
  const totals: Record<MigrationStatus, number> = {
    MISSING: 0,
    MATCHED: 0,
    CONFLICT: 0,
    BLOCKED: 0,
    UNKNOWN: 0,
  };
  for (const result of results) totals[result.status] += 1;
  return {
    schemaVersion: 1,
    mode,
    generatedAt: new Date().toISOString(),
    sourceCloudName: source.cloudName,
    targetCloudName: target.cloudName,
    manifestSha256: manifestDigest(manifest),
    totals,
    copiedCount: results.filter((result) => result.copiedDuringMigration)
      .length,
    alreadyMatchedCount: results.filter(
      (result) => result.status === "MATCHED" && !result.copiedDuringMigration,
    ).length,
    verifiedCount: totals.MATCHED,
    failedCount: results.filter((result) => result.status !== "MATCHED").length,
    conflictCount: totals.CONFLICT,
    missingCount: totals.MISSING,
    cutoverReady:
      results.length > 0 &&
      totals.MISSING === 0 &&
      totals.CONFLICT === 0 &&
      totals.BLOCKED === 0 &&
      totals.UNKNOWN === 0,
    bytesPlanned: results.reduce(
      (sum, result) =>
        sum +
        (result.sourceStatus === "PRESENT" && result.targetStatus === "MISSING"
          ? result.bytes
          : 0),
      0,
    ),
    bytesCopied: results.reduce(
      (sum, result) => sum + (result.copiedDuringMigration ? result.bytes : 0),
      0,
    ),
    estimatedProviderRequests: results.reduce((sum, result) => {
      if (mode === "preflight" || mode === "dry-run")
        return sum + (result.sourceStatus === "PRESENT" ? 2 : 1);
      if (mode === "verify") {
        if (result.sourceStatus !== "PRESENT") return sum + 1;
        return sum + (result.targetStatus === "PRESENT" ? 4 : 2);
      }
      if (result.sourceStatus !== "PRESENT") return sum + 1;
      if (result.copiedThisRun) return sum + 6;
      if (result.targetStatus === "MISSING") return sum + 6;
      return sum + (result.targetStatus === "PRESENT" ? 4 : 2);
    }, 0),
    results,
  };
}

function assertAccounts(
  manifest: MediaMigrationManifest,
  source: MediaMigrationGateway,
  target: MediaMigrationGateway,
): void {
  if (source.cloudName !== manifest.sourceCloudName)
    throw new Error(
      "The source Cloudinary account does not match the manifest.",
    );
  if (source.cloudName === target.cloudName)
    throw new Error("Source and target Cloudinary accounts must be different.");
}

async function mapLimit<T, R>(
  values: readonly T[],
  concurrency: number,
  work: (value: T) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8)
    throw new Error("Migration concurrency must be between 1 and 8.");
  const results = new Array<R>(values.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, async () => {
      while (true) {
        const index = next++;
        if (index >= values.length) return;
        const value = values[index];
        if (value !== undefined) results[index] = await work(value);
      }
    }),
  );
  return results;
}

async function retry<T>(
  work: () => Promise<T>,
  retryCount: number,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      lastError = error;
      if (attempt < retryCount)
        await new Promise((resolve) => setTimeout(resolve, 150 * 2 ** attempt));
    }
  }
  throw lastError;
}
