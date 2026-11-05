import { createHash } from "node:crypto";
import { Transform, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { v2 as cloudinary } from "cloudinary";
import type { AdminApiOptions, UploadApiResponse } from "cloudinary";
import type { MediaMigrationItem } from "./manifest.js";
import type {
  ContentDigest,
  MediaMigrationGateway,
  ResourceMetadata,
} from "./workflow.js";

export type CloudinaryMigrationCredentials = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folderMode: "fixed" | "dynamic";
};

export class CloudinaryMigrationGateway implements MediaMigrationGateway {
  readonly cloudName: string;

  constructor(private readonly credentials: CloudinaryMigrationCredentials) {
    this.cloudName = credentials.cloudName;
  }

  async inspect(item: MediaMigrationItem): Promise<ResourceMetadata | null> {
    try {
      const result = await cloudinary.api.resource(
        item.sourcePublicId,
        this.adminOptions({
          resource_type: item.resourceType,
          type: "authenticated",
        }),
      );
      return {
        publicId: typeof result.public_id === "string" ? result.public_id : "",
        resourceType:
          typeof result.resource_type === "string" ? result.resource_type : "",
        deliveryType: typeof result.type === "string" ? result.type : "",
        format: typeof result.format === "string" ? result.format : "",
        bytes: typeof result.bytes === "number" ? result.bytes : -1,
      };
    } catch (error) {
      if (httpStatus(error) === 404) return null;
      throw new Error("Cloudinary resource metadata request failed.");
    }
  }

  async digest(item: MediaMigrationItem): Promise<ContentDigest> {
    const response = await this.fetchSource(item);
    const verifier = new SniffingHashTransform(item);
    await pipeline(
      response,
      verifier,
      new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      }),
    );
    return verifier.result();
  }

  async copyTo(
    item: MediaMigrationItem,
    target: MediaMigrationGateway,
  ): Promise<ContentDigest> {
    if (!(target instanceof CloudinaryMigrationGateway))
      throw new Error("Migration target provider is not Cloudinary.");
    const response = await this.fetchSource(item);
    const verifier = new SniffingHashTransform(item);
    const uploadResult = target.createUpload(item);
    await pipeline(response, verifier, uploadResult.stream);
    const uploaded = await uploadResult.result;
    if (
      uploaded.public_id !== item.sourcePublicId ||
      uploaded.resource_type !== item.resourceType ||
      uploaded.type !== "authenticated" ||
      uploaded.format.toLowerCase() !== item.format.toLowerCase() ||
      uploaded.bytes !== item.fileSize
    ) {
      throw new Error("Cloudinary target metadata failed post-upload checks.");
    }
    return verifier.result();
  }

  private createUpload(item: MediaMigrationItem): {
    stream: NodeJS.WritableStream;
    result: Promise<UploadApiResponse>;
  } {
    const options = {
      ...this.adminOptions(),
      public_id: item.sourcePublicId,
      resource_type: item.resourceType,
      type: "authenticated" as const,
      overwrite: false,
      use_filename: false,
      unique_filename: false,
      ...(this.credentials.folderMode === "dynamic"
        ? {
            asset_folder: item.sourcePublicId.split("/").slice(0, -1).join("/"),
          }
        : {}),
    };
    let resolveResult!: (result: UploadApiResponse) => void;
    let rejectResult!: (error: Error) => void;
    const result = new Promise<UploadApiResponse>((resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    });
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, response) => {
        if (error || !response) {
          rejectResult(new Error("Cloudinary target upload failed."));
          return;
        }
        resolveResult(response);
      },
    );
    return { stream, result };
  }

  private async fetchSource(item: MediaMigrationItem): Promise<Readable> {
    const expiresAt = Math.floor(Date.now() / 1000) + 600;
    const urlOptions = {
      cloud_name: this.credentials.cloudName,
      api_key: this.credentials.apiKey,
      api_secret: this.credentials.apiSecret,
      secure: true,
      resource_type: item.resourceType,
      type: "authenticated" as const,
      expires_at: expiresAt,
      attachment: false,
    } as Parameters<typeof cloudinary.utils.private_download_url>[2] &
      Record<string, unknown>;
    const signedUrl = cloudinary.utils.private_download_url(
      item.sourcePublicId,
      item.format,
      urlOptions,
    );
    const url = new URL(signedUrl);
    if (url.protocol !== "https:" || url.hostname !== "api.cloudinary.com")
      throw new Error(
        "Generated Cloudinary download URL failed host validation.",
      );
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: "error",
        signal: AbortSignal.timeout(10 * 60 * 1000),
        headers: { Accept: item.mimeType },
      });
    } catch {
      throw new Error("Cloudinary source download could not be opened.");
    }
    if (!response.ok || !response.body)
      throw new Error("Cloudinary source download returned an error response.");
    const contentType = response.headers
      .get("content-type")
      ?.split(";")[0]
      ?.trim()
      .toLowerCase();
    const acceptableTypes = acceptableContentTypes(item);
    if (!contentType || !acceptableTypes.has(contentType))
      throw new Error(
        "Cloudinary source content type does not match the manifest.",
      );
    const lengthHeader = response.headers.get("content-length");
    if (lengthHeader && Number(lengthHeader) !== item.fileSize)
      throw new Error(
        "Cloudinary source content length does not match the manifest.",
      );
    return Readable.fromWeb(
      response.body as import("node:stream/web").ReadableStream<Uint8Array>,
    );
  }

  private adminOptions(extra: Record<string, unknown> = {}): AdminApiOptions {
    return {
      cloud_name: this.credentials.cloudName,
      api_key: this.credentials.apiKey,
      api_secret: this.credentials.apiSecret,
      secure: true,
      ...extra,
    } as AdminApiOptions;
  }
}

class SniffingHashTransform extends Transform {
  private readonly hash = createHash("sha256");
  private byteCount = 0;
  private prefix = Buffer.alloc(0);
  private checked = false;
  private digestValue: string | null = null;

  constructor(private readonly item: MediaMigrationItem) {
    super();
  }

  override _transform(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null, data?: Buffer) => void,
  ): void {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    this.byteCount += bytes.length;
    if (this.byteCount > this.item.fileSize) {
      callback(new Error("Downloaded source exceeded the manifest size."));
      return;
    }
    this.hash.update(bytes);
    if (this.checked) {
      callback(null, bytes);
      return;
    }
    this.prefix = Buffer.concat([this.prefix, bytes]);
    if (this.prefix.length < requiredHeaderLength(this.item)) {
      callback();
      return;
    }
    if (!hasExpectedMagic(this.prefix, this.item)) {
      callback(new Error("Downloaded bytes are not the declared media type."));
      return;
    }
    this.checked = true;
    const prefix = this.prefix;
    this.prefix = Buffer.alloc(0);
    callback(null, prefix);
  }

  override _flush(callback: (error?: Error | null) => void): void {
    if (!this.checked || this.byteCount !== this.item.fileSize) {
      callback(new Error("Downloaded bytes failed type or size verification."));
      return;
    }
    this.digestValue = this.hash.digest("hex");
    callback();
  }

  result(): ContentDigest {
    if (!this.digestValue)
      throw new Error("Streaming digest has not completed.");
    return { sha256: this.digestValue, bytes: this.byteCount };
  }
}

function requiredHeaderLength(item: MediaMigrationItem): number {
  if (item.mimeType === "application/pdf" || item.mimeType === "audio/mpeg")
    return 5;
  return 12;
}

function hasExpectedMagic(buffer: Buffer, item: MediaMigrationItem): boolean {
  if (item.mimeType === "application/pdf")
    return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (item.mimeType === "audio/mpeg")
    return (
      buffer.subarray(0, 3).toString("ascii") === "ID3" ||
      (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1]! & 0xe0) === 0xe0)
    );
  if (item.mimeType === "audio/mp4")
    return buffer.subarray(4, 8).toString("ascii") === "ftyp";
  if (item.mimeType === "audio/wav")
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WAVE"
    );
  if (item.mimeType === "audio/ogg")
    return buffer.subarray(0, 4).toString("ascii") === "OggS";
  return false;
}

function acceptableContentTypes(item: MediaMigrationItem): Set<string> {
  const values = new Set([item.mimeType, "application/octet-stream"]);
  if (item.mimeType === "audio/mp4") values.add("video/mp4");
  return values;
}

function httpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  if ("http_code" in error && typeof error.http_code === "number")
    return error.http_code;
  return undefined;
}
