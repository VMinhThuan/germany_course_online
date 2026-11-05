import { describe, expect, it } from "vitest";
import {
  assertJournalMatches,
  createJournal,
} from "../../scripts/media-migration/journal.js";
import {
  buildManifest,
  validateManifest,
  type MediaMigrationItem,
  type MediaMigrationManifest,
} from "../../scripts/media-migration/manifest.js";
import {
  inspectOne,
  runMigrationCopy,
  runMigrationReadOnly,
  type ContentDigest,
  type MediaMigrationGateway,
  type ResourceMetadata,
} from "../../scripts/media-migration/workflow.js";

const item: MediaMigrationItem = {
  assetId: "65aabbccddeeff0011223344",
  sourcePublicId: "lesson-pdf/65aabbccddeeff0011223344",
  mediaType: "PDF",
  mimeType: "application/pdf",
  fileSize: 12,
  resourceType: "image",
  deliveryType: "authenticated",
  format: "pdf",
};

function manifest(
  items: MediaMigrationItem[] = [item],
): MediaMigrationManifest {
  return validateManifest({
    schemaVersion: 1,
    generatedAt: "2026-11-04T00:00:00.000Z",
    sourceCloudName: "source-cloud",
    exclusions: {
      totalScanned: items.length,
      excludedS3: 0,
      excludedNonReady: 0,
      excludedNonPdfAudio: 0,
      excludedInvalidMetadata: 0,
    },
    items,
  });
}

class FakeGateway implements MediaMigrationGateway {
  readonly resources = new Map<string, ResourceMetadata>();
  readonly digests = new Map<string, ContentDigest>();
  copyCount = 0;

  constructor(readonly cloudName: string) {}

  async inspect(asset: MediaMigrationItem) {
    return this.resources.get(asset.sourcePublicId) ?? null;
  }

  async digest(asset: MediaMigrationItem) {
    const digest = this.digests.get(asset.sourcePublicId);
    if (!digest) throw new Error("No test digest.");
    return digest;
  }

  async copyTo(asset: MediaMigrationItem, target: MediaMigrationGateway) {
    this.copyCount += 1;
    if (!(target instanceof FakeGateway))
      throw new Error("Unexpected gateway.");
    const metadata = validMetadata(asset);
    if (target.resources.has(asset.sourcePublicId))
      throw new Error("overwrite=false conflict");
    target.resources.set(asset.sourcePublicId, metadata);
    const digest = this.digests.get(asset.sourcePublicId);
    if (!digest) throw new Error("No test digest.");
    target.digests.set(asset.sourcePublicId, digest);
    return digest;
  }
}

function validMetadata(asset: MediaMigrationItem): ResourceMetadata {
  return {
    publicId: asset.sourcePublicId,
    resourceType: asset.resourceType,
    deliveryType: "authenticated",
    format: asset.format,
    bytes: asset.fileSize,
  };
}

describe("Cloudinary media migration manifest", () => {
  it("exports only READY authenticated Cloudinary PDFs and audio with exclusion counts", () => {
    const result = buildManifest(
      [
        {
          _id: item.assetId,
          provider: "CLOUDINARY",
          storageKey: item.sourcePublicId,
          mediaType: "PDF",
          mimeType: "application/pdf",
          fileSize: item.fileSize,
          resourceType: "image",
          deliveryType: "authenticated",
          format: "pdf",
          uploadStatus: "READY",
          deletedAt: null,
        },
        { provider: "S3_COMPATIBLE", uploadStatus: "READY", mediaType: "PDF" },
        { provider: "CLOUDINARY", uploadStatus: "PENDING", mediaType: "PDF" },
        { provider: "CLOUDINARY", uploadStatus: "READY", mediaType: "VIDEO" },
        {
          _id: "65aabbccddeeff0011223355",
          provider: "CLOUDINARY",
          storageKey: "lesson-pdf/65aabbccddeeff0011223355",
          mediaType: "PDF",
          mimeType: "application/pdf",
          fileSize: 10,
          resourceType: "video",
          deliveryType: "authenticated",
          format: "pdf",
          uploadStatus: "READY",
          deletedAt: null,
        },
      ],
      "source-cloud",
      new Date("2026-11-04T00:00:00.000Z"),
    );
    expect(result.items).toHaveLength(1);
    expect(result.exclusions).toEqual({
      totalScanned: 5,
      excludedS3: 1,
      excludedNonReady: 1,
      excludedNonPdfAudio: 1,
      excludedInvalidMetadata: 1,
    });
    expect(JSON.stringify(result)).not.toMatch(/https?:\/\//i);
  });

  it("rejects URLs and unknown fields instead of trusting manifest input", () => {
    expect(() =>
      validateManifest({
        ...manifest(),
        sourceUrl: "https://127.0.0.1/private",
      }),
    ).toThrow();
    expect(() =>
      validateManifest({
        ...manifest(),
        items: [{ ...item, sourcePublicId: "https://attacker.test/file" }],
      }),
    ).toThrow();
  });
});

describe("Cloudinary migration verification and copy guards", () => {
  it("does not call metadata-only matches MATCHED", async () => {
    const source = new FakeGateway("source-cloud");
    const target = new FakeGateway("target-cloud");
    source.resources.set(item.sourcePublicId, validMetadata(item));
    target.resources.set(item.sourcePublicId, validMetadata(item));
    const preflight = await inspectOne(item, source, target, false);
    expect(preflight.status).toBe("UNKNOWN");
    source.digests.set(item.sourcePublicId, {
      sha256: "a".repeat(64),
      bytes: item.fileSize,
    });
    target.digests.set(item.sourcePublicId, {
      sha256: "b".repeat(64),
      bytes: item.fileSize,
    });
    const verified = await inspectOne(item, source, target, true);
    expect(verified.status).toBe("CONFLICT");
  });

  it("streams a missing target once and requires verified byte equality", async () => {
    const source = new FakeGateway("source-cloud");
    const target = new FakeGateway("target-cloud");
    source.resources.set(item.sourcePublicId, validMetadata(item));
    source.digests.set(item.sourcePublicId, {
      sha256: "c".repeat(64),
      bytes: item.fileSize,
    });
    const report = await runMigrationCopy(manifest(), source, target, {
      mode: "copy",
      concurrency: 1,
      retryCount: 0,
    });
    expect(report.totals.MATCHED).toBe(1);
    expect(source.copyCount).toBe(1);
    expect(target.digests.get(item.sourcePublicId)?.sha256).toBe(
      "c".repeat(64),
    );
    expect(report.bytesPlanned).toBe(0);
    expect(report.bytesCopied).toBe(item.fileSize);
    expect(report.copiedCount).toBe(1);
    expect(report.verifiedCount).toBe(1);
    expect(report.cutoverReady).toBe(true);
    expect(report.estimatedProviderRequests).toBe(6);
  });

  it("never overwrites an existing target conflict", async () => {
    const source = new FakeGateway("source-cloud");
    const target = new FakeGateway("target-cloud");
    source.resources.set(item.sourcePublicId, validMetadata(item));
    target.resources.set(item.sourcePublicId, validMetadata(item));
    source.digests.set(item.sourcePublicId, {
      sha256: "d".repeat(64),
      bytes: item.fileSize,
    });
    target.digests.set(item.sourcePublicId, {
      sha256: "e".repeat(64),
      bytes: item.fileSize,
    });
    const report = await runMigrationCopy(manifest(), source, target, {
      mode: "copy",
      concurrency: 1,
      retryCount: 0,
    });
    expect(report.totals.CONFLICT).toBe(1);
    expect(source.copyCount).toBe(0);
  });

  it("resumes from a journaled match after rechecking byte parity", async () => {
    const source = new FakeGateway("source-cloud");
    const target = new FakeGateway("target-cloud");
    source.resources.set(item.sourcePublicId, validMetadata(item));
    target.resources.set(item.sourcePublicId, validMetadata(item));
    const digest = { sha256: "f".repeat(64), bytes: item.fileSize };
    source.digests.set(item.sourcePublicId, digest);
    target.digests.set(item.sourcePublicId, digest);
    const previous = new Map([
      [
        item.assetId,
        {
          assetId: item.assetId,
          sourcePublicId: item.sourcePublicId,
          targetPublicId: item.sourcePublicId,
          status: "MATCHED" as const,
          copiedThisRun: false,
          copiedDuringMigration: true,
          sourceStatus: "PRESENT" as const,
          targetStatus: "PRESENT" as const,
          bytes: item.fileSize,
          sha256: digest.sha256,
        },
      ],
    ]);
    const report = await runMigrationCopy(
      manifest(),
      source,
      target,
      { mode: "resume", concurrency: 1, retryCount: 0 },
      previous,
    );
    expect(source.copyCount).toBe(0);
    expect(report.copiedCount).toBe(1);
    expect(report.bytesCopied).toBe(item.fileSize);
    expect(report.alreadyMatchedCount).toBe(0);
    expect(report.estimatedProviderRequests).toBe(4);
  });

  it("requires distinct source and target account identities", async () => {
    const source = new FakeGateway("source-cloud");
    await expect(
      runMigrationReadOnly(
        manifest(),
        source,
        new FakeGateway("source-cloud"),
        "preflight",
      ),
    ).rejects.toThrow(/must be different/);
  });

  it("reports only required bytes and nominal requests for metadata preflight", async () => {
    const source = new FakeGateway("source-cloud");
    const target = new FakeGateway("target-cloud");
    const sourceMissing = await runMigrationReadOnly(
      manifest(),
      source,
      target,
      "dry-run",
    );
    expect(sourceMissing.bytesPlanned).toBe(0);
    expect(sourceMissing.estimatedProviderRequests).toBe(1);

    source.resources.set(item.sourcePublicId, validMetadata(item));
    const targetMissing = await runMigrationReadOnly(
      manifest(),
      source,
      target,
      "dry-run",
    );
    expect(targetMissing.bytesPlanned).toBe(item.fileSize);
    expect(targetMissing.estimatedProviderRequests).toBe(2);
  });

  it("rejects a resume journal with results outside its bound manifest", () => {
    const journal = createJournal(manifest(), "target-cloud", [
      {
        assetId: item.assetId,
        sourcePublicId: "other/asset",
        targetPublicId: "other/asset",
        status: "MATCHED",
        copiedThisRun: false,
        copiedDuringMigration: false,
        sourceStatus: "PRESENT",
        targetStatus: "PRESENT",
        bytes: item.fileSize,
      },
    ]);
    expect(() =>
      assertJournalMatches(journal, manifest(), "target-cloud"),
    ).toThrow(/outside the manifest/);
  });
});
