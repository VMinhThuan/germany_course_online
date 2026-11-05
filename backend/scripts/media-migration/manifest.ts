import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { z } from "zod";

const publicIdPattern = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/;
const manifestItemSchema = z
  .strictObject({
    assetId: z.string().regex(/^[a-fA-F0-9]{24}$/),
    sourcePublicId: z.string().min(1).max(500).regex(publicIdPattern),
    mediaType: z.enum(["PDF", "AUDIO"]),
    mimeType: z.enum([
      "application/pdf",
      "audio/mpeg",
      "audio/mp4",
      "audio/wav",
      "audio/ogg",
    ]),
    fileSize: z
      .number()
      .int()
      .min(1)
      .max(250 * 1024 * 1024),
    resourceType: z.enum(["image", "video"]),
    deliveryType: z.literal("authenticated"),
    format: z.string().min(2).max(12),
  })
  .superRefine((item, context) => {
    const maximum =
      item.mediaType === "PDF" ? 40 * 1024 * 1024 : 50 * 1024 * 1024;
    if (item.fileSize > maximum)
      context.addIssue({
        code: "custom",
        path: ["fileSize"],
        message: "Asset exceeds the supported size limit.",
      });
  });

export const mediaMigrationManifestSchema = z.strictObject({
  schemaVersion: z.literal(1),
  generatedAt: z.string().datetime(),
  sourceCloudName: z.string().regex(/^[A-Za-z0-9_-]{1,120}$/),
  exclusions: z.strictObject({
    totalScanned: z.number().int().min(0),
    excludedS3: z.number().int().min(0),
    excludedNonReady: z.number().int().min(0),
    excludedNonPdfAudio: z.number().int().min(0),
    excludedInvalidMetadata: z.number().int().min(0),
  }),
  items: z.array(manifestItemSchema).max(100_000),
});

export type MediaMigrationItem = z.infer<typeof manifestItemSchema>;
export type MediaMigrationManifest = z.infer<
  typeof mediaMigrationManifestSchema
>;

export function validateManifest(value: unknown): MediaMigrationManifest {
  const manifest = mediaMigrationManifestSchema.parse(value);
  const excluded =
    manifest.exclusions.excludedS3 +
    manifest.exclusions.excludedNonReady +
    manifest.exclusions.excludedNonPdfAudio +
    manifest.exclusions.excludedInvalidMetadata;
  if (manifest.exclusions.totalScanned !== manifest.items.length + excluded)
    throw new Error(
      "Manifest exclusion counts do not reconcile with the item inventory.",
    );
  const ids = new Set<string>();
  const publicIds = new Set<string>();
  for (const item of manifest.items) {
    if (ids.has(item.assetId))
      throw new Error("Manifest contains duplicate asset ids.");
    if (publicIds.has(item.sourcePublicId))
      throw new Error("Manifest contains duplicate source public ids.");
    ids.add(item.assetId);
    publicIds.add(item.sourcePublicId);
    const expected = expectedMetadata(
      item.mediaType,
      item.mimeType,
      item.format,
    );
    if (
      expected.resourceType !== item.resourceType ||
      expected.format !== item.format ||
      expected.mimeType !== item.mimeType
    ) {
      throw new Error(
        "Manifest media type and provider metadata do not agree.",
      );
    }
  }
  return manifest;
}

export async function readManifest(
  path: string,
): Promise<MediaMigrationManifest> {
  const raw = await readFile(path, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Manifest is not valid JSON.");
  }
  return validateManifest(parsed);
}

export function manifestDigest(manifest: MediaMigrationManifest): string {
  return createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
}

export function buildManifest(
  rows: readonly Record<string, unknown>[],
  sourceCloudName: string,
  generatedAt = new Date(),
): MediaMigrationManifest {
  let excludedS3 = 0;
  let excludedNonReady = 0;
  let excludedNonPdfAudio = 0;
  let excludedInvalidMetadata = 0;
  const items: MediaMigrationItem[] = [];
  for (const row of rows) {
    if (row.provider !== "CLOUDINARY") {
      excludedS3 += 1;
      continue;
    }
    if (row.uploadStatus !== "READY" || row.deletedAt) {
      excludedNonReady += 1;
      continue;
    }
    if (row.mediaType !== "PDF" && row.mediaType !== "AUDIO") {
      excludedNonPdfAudio += 1;
      continue;
    }
    const item = {
      assetId: String(row._id ?? ""),
      sourcePublicId: String(row.storageKey ?? ""),
      mediaType: row.mediaType,
      mimeType: row.mimeType,
      fileSize: row.fileSize,
      resourceType: row.resourceType,
      deliveryType: row.deliveryType,
      format: row.format,
    };
    const parsed = manifestItemSchema.safeParse(item);
    if (!parsed.success) {
      excludedInvalidMetadata += 1;
      continue;
    }
    try {
      const expected = expectedMetadata(
        parsed.data.mediaType,
        parsed.data.mimeType,
        parsed.data.format,
      );
      if (
        expected.resourceType !== parsed.data.resourceType ||
        expected.format !== parsed.data.format
      ) {
        excludedInvalidMetadata += 1;
        continue;
      }
    } catch {
      excludedInvalidMetadata += 1;
      continue;
    }
    items.push(parsed.data);
  }
  return validateManifest({
    schemaVersion: 1,
    generatedAt: generatedAt.toISOString(),
    sourceCloudName,
    exclusions: {
      totalScanned: rows.length,
      excludedS3,
      excludedNonReady,
      excludedNonPdfAudio,
      excludedInvalidMetadata,
    },
    items,
  });
}

function expectedMetadata(
  mediaType: string,
  mimeType: string,
  format: string,
): { resourceType: "image" | "video"; mimeType: string; format: string } {
  if (mediaType === "PDF" && mimeType === "application/pdf" && format === "pdf")
    return { resourceType: "image", mimeType, format };
  const formats: Record<string, string[]> = {
    "audio/mpeg": ["mp3", "mpeg"],
    "audio/mp4": ["m4a", "mp4"],
    "audio/wav": ["wav", "wave"],
    "audio/ogg": ["ogg", "oga"],
  };
  const audioFormats = formats[mimeType];
  if (mediaType === "AUDIO" && audioFormats?.includes(format))
    return { resourceType: "video", mimeType, format };
  throw new Error("Unsupported media type metadata.");
}
