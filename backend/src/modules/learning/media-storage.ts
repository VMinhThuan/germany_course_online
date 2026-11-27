import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v2 as cloudinary } from "cloudinary";
import type { AppConfig, MediaProvider } from "../../config/env.js";
import { AppError } from "../../shared/errors.js";

export type SignedMediaUrl = {
  url: string;
  expiresAt: Date;
};

export type MediaResourceType = "image" | "video" | "raw";
export type MediaDeliveryType = "upload" | "private" | "authenticated";

/** Internal Cloudinary namespace reserved exclusively for payment proofs. */
export const PAYMENT_PROOF_FOLDER = "payment-proofs";

export type SignMediaInput = {
  storageKey: string;
  mimeType: string;
  mediaType?: string;
  assetFolder?: string;
  resourceType?: MediaResourceType | null;
  deliveryType?: MediaDeliveryType | null;
  format?: string | null;
};

export type CreateUploadInput = {
  storageKey: string;
  mimeType: string;
  fileSize: number;
  expiresInSeconds: number;
  mediaType?: string;
  resourceType?: MediaResourceType;
  deliveryType?: MediaDeliveryType;
  assetFolder?: string;
};

export type MediaUploadInstructions = {
  provider: MediaProvider;
  method: "PUT" | "POST";
  url: string;
  headers?: Record<string, string>;
  fields?: Record<string, string>;
  expiresAt: Date;
};

export type VerifyMediaInput = {
  storageKey: string;
  mimeType: string;
  fileSize: number;
  mediaType: string;
  assetFolder?: string;
  resourceType?: MediaResourceType | null;
  deliveryType?: MediaDeliveryType | null;
};

export type UploadedObjectMetadata = {
  contentLength: number | null;
  contentType: string | null;
  providerAssetId?: string | null;
  resourceType?: MediaResourceType | null;
  deliveryType?: MediaDeliveryType | null;
  format?: string | null;
  durationSeconds?: number | null;
};

export type DeleteMediaInput = {
  storageKey: string;
  mediaType?: string;
  resourceType?: MediaResourceType | null;
  deliveryType?: MediaDeliveryType | null;
};

export interface MediaStorageAdapter {
  readonly provider?: MediaProvider | undefined;
  resolve?(provider: MediaProvider): MediaStorageAdapter | undefined;
  createStorageKey?(
    mediaType: string,
    uniqueId: string,
    assetFolder?: string,
  ): string;
  listUploadFolders?(mediaType: string): Promise<string[]>;
  signRead(input: SignMediaInput): Promise<SignedMediaUrl>;
  signPlayback?(input: SignMediaInput): string;
  createUpload?(input: CreateUploadInput): Promise<MediaUploadInstructions>;
  headObject?(storageKey: string): Promise<UploadedObjectMetadata | null>;
  verifyUpload?(
    input: VerifyMediaInput,
  ): Promise<UploadedObjectMetadata | null>;
  /** Read the bounded object and validate its image container, not just its MIME label. */
  verifyImageSignature?(input: VerifyMediaInput): Promise<boolean>;
  deleteObject?(storageKey: string): Promise<void>;
  deleteAsset?(input: DeleteMediaInput): Promise<void>;
}

export class UnconfiguredMediaStorage implements MediaStorageAdapter {
  readonly provider = undefined;

  async signRead(_input: SignMediaInput): Promise<SignedMediaUrl> {
    throw mediaUnavailable();
  }

  async createUpload(
    _input: CreateUploadInput,
  ): Promise<MediaUploadInstructions> {
    throw mediaUnavailable();
  }

  async headObject(
    _storageKey: string,
  ): Promise<UploadedObjectMetadata | null> {
    throw mediaUnavailable();
  }

  async verifyUpload(
    _input: VerifyMediaInput,
  ): Promise<UploadedObjectMetadata | null> {
    throw mediaUnavailable();
  }

  async verifyImageSignature(_input: VerifyMediaInput): Promise<boolean> {
    throw mediaUnavailable();
  }

  async deleteObject(_storageKey: string): Promise<void> {
    throw mediaUnavailable();
  }

  async deleteAsset(_input: DeleteMediaInput): Promise<void> {
    throw mediaUnavailable();
  }
}

export class S3CompatibleMediaStorage implements MediaStorageAdapter {
  readonly provider = "S3_COMPATIBLE" as const;
  private readonly client: S3Client;

  constructor(private readonly config: NonNullable<AppConfig["mediaStorage"]>) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async signRead(input: SignMediaInput): Promise<SignedMediaUrl> {
    if (!input.storageKey || input.storageKey.trim() !== input.storageKey) {
      throw invalidMediaKey();
    }
    const expiresIn = this.config.signedUrlTtlSeconds;
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: input.storageKey,
      ResponseContentType: input.mimeType,
      ResponseCacheControl: "private, no-store",
    });
    const url = await getSignedUrl(this.client, command, { expiresIn });
    return { url, expiresAt: new Date(Date.now() + expiresIn * 1000) };
  }

  async createUpload(
    input: CreateUploadInput,
  ): Promise<MediaUploadInstructions> {
    validateStorageKey(input.storageKey);
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: input.storageKey,
      ContentType: input.mimeType,
      ContentLength: input.fileSize,
    });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: input.expiresInSeconds,
    });
    return {
      provider: this.provider,
      method: "PUT",
      url,
      headers: { "Content-Type": input.mimeType },
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000),
    };
  }

  async headObject(storageKey: string): Promise<UploadedObjectMetadata | null> {
    validateStorageKey(storageKey);
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.config.bucket, Key: storageKey }),
      );
      return {
        contentLength: result.ContentLength ?? null,
        contentType: result.ContentType ?? null,
      };
    } catch (error) {
      const status = getHttpStatus(error);
      if (status === 404) return null;
      throw mediaUnavailable(
        "Uploaded media could not be verified with the configured provider.",
      );
    }
  }

  verifyUpload(
    input: VerifyMediaInput,
  ): Promise<UploadedObjectMetadata | null> {
    return this.headObject(input.storageKey);
  }

  async verifyImageSignature(input: VerifyMediaInput): Promise<boolean> {
    validateStorageKey(input.storageKey);
    try {
      const result = await this.client.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: input.storageKey,
        }),
      );
      const bytes = await readObjectBytes(result.Body, input.fileSize);
      return bytes ? matchesImageSignature(input.mimeType, bytes) : false;
    } catch (error) {
      if (getHttpStatus(error) === 404) return false;
      throw mediaUnavailable(
        "Uploaded image content could not be inspected with the configured provider.",
      );
    }
  }

  async deleteObject(storageKey: string): Promise<void> {
    validateStorageKey(storageKey);
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: storageKey,
        }),
      );
    } catch {
      throw mediaUnavailable(
        "Media object could not be deleted from the configured provider.",
      );
    }
  }

  deleteAsset(input: DeleteMediaInput): Promise<void> {
    return this.deleteObject(input.storageKey);
  }

  destroy(): void {
    this.client.destroy();
  }
}

export class CloudinaryMediaStorage implements MediaStorageAdapter {
  readonly provider = "CLOUDINARY" as const;

  constructor(
    private readonly config: NonNullable<AppConfig["cloudinaryMedia"]>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async signRead(input: SignMediaInput): Promise<SignedMediaUrl> {
    const resourceType =
      input.resourceType ??
      resourceTypeForMedia(input.mediaType, input.mimeType);
    const rawGenericFile = input.mediaType === "FILE" && resourceType === "raw";
    const format = rawGenericFile
      ? ""
      : (input.format ?? formatForMime(input.mimeType) ?? "");
    const folders = foldersForInput(
      this.config,
      input.mediaType,
      input.assetFolder,
    );
    if (
      !resourceType ||
      (!format && !rawGenericFile) ||
      !folders.length ||
      !isValidCloudinaryPublicId(input.storageKey, folders, rawGenericFile) ||
      resourceType !== resourceTypeForMedia(input.mediaType, input.mimeType) ||
      (input.deliveryType && input.deliveryType !== "authenticated")
    ) {
      throw mediaUnavailable(
        "Cloudinary protected delivery metadata is incomplete or unsupported.",
      );
    }
    const expiresAt = new Date(
      this.now().getTime() + this.config.signedUrlTtlSeconds * 1000,
    );
    const urlOptions = {
      cloud_name: this.config.cloudName,
      api_key: this.config.apiKey,
      api_secret: this.config.apiSecret,
      secure: true,
      resource_type: resourceType,
      type: "authenticated" as const,
      expires_at: Math.floor(expiresAt.getTime() / 1000),
      attachment: input.mediaType === "FILE",
    };
    const url = cloudinary.utils.private_download_url(
      input.storageKey,
      format,
      urlOptions,
    );
    return { url, expiresAt };
  }

  signPlayback(input: SignMediaInput): string {
    const resourceType =
      input.resourceType ??
      resourceTypeForMedia(input.mediaType, input.mimeType);
    const format = input.format ?? formatForMime(input.mimeType ?? "");
    const folders = foldersForMedia(this.config, "FILE");
    if (
      input.mediaType !== "FILE" ||
      !input.mimeType?.startsWith("video/") ||
      resourceType !== "video" ||
      input.deliveryType !== "authenticated" ||
      !format ||
      !isValidCloudinaryPublicId(input.storageKey, folders)
    ) {
      throw mediaUnavailable(
        "Cloudinary playback metadata is incomplete or unsupported.",
      );
    }

    return cloudinary.url(input.storageKey, {
      cloud_name: this.config.cloudName,
      api_secret: this.config.apiSecret,
      secure: true,
      resource_type: "video",
      type: "authenticated",
      format,
      sign_url: true,
      force_version: false,
    });
  }

  async createUpload(
    input: CreateUploadInput,
  ): Promise<MediaUploadInstructions> {
    const resourceType =
      input.resourceType ??
      resourceTypeForMedia(input.mediaType, input.mimeType);
    const rawGenericFile = input.mediaType === "FILE" && resourceType === "raw";
    const configuredFolders = foldersForInput(
      this.config,
      input.mediaType,
      input.assetFolder,
    );
    const folder = input.assetFolder ?? configuredFolders[0];
    if (
      !resourceType ||
      resourceType !== resourceTypeForMedia(input.mediaType, input.mimeType) ||
      !folder ||
      !configuredFolders.length ||
      !configuredFolders.some((root) => isValidCloudinaryFolder(folder, root))
    ) {
      throw new AppError(
        422,
        "MEDIA_TYPE_UNSUPPORTED",
        "Cloudinary does not support this media type or folder.",
      );
    }
    if (
      !isValidCloudinaryPublicId(input.storageKey, [folder], rawGenericFile) ||
      (input.deliveryType && input.deliveryType !== "authenticated")
    ) {
      throw mediaUnavailable(
        "Cloudinary uploads are limited to authenticated media in configured folders.",
      );
    }
    const timestamp = Math.floor(this.now().getTime() / 1000);
    const signedParams: Record<string, string | number | boolean> = {
      timestamp,
      public_id: input.storageKey,
      type: "authenticated",
      overwrite: false,
      ...(this.config.folderMode === "dynamic" ? { asset_folder: folder } : {}),
    };
    const signature = cloudinary.utils.api_sign_request(
      signedParams,
      this.config.apiSecret,
    );
    const url = `https://api.cloudinary.com/v1_1/${encodeURIComponent(this.config.cloudName)}/${resourceType}/upload`;
    const fields = Object.fromEntries(
      Object.entries({
        ...signedParams,
        timestamp: String(timestamp),
        overwrite: "false",
        api_key: this.config.apiKey,
        signature,
      }).map(([key, value]) => [key, String(value)]),
    );
    // Cloudinary upload signatures are accepted for one hour from their timestamp.
    return {
      provider: this.provider,
      method: "POST",
      url,
      fields,
      expiresAt: new Date((timestamp + 3600) * 1000),
    };
  }

  async listUploadFolders(mediaType: string): Promise<string[]> {
    const rootFolders = foldersForMedia(this.config, mediaType);
    if (!rootFolders.length) return [];
    const foldersByRoot = await Promise.all(
      rootFolders.map(async (rootFolder) => {
        try {
          const response = await cloudinary.api.sub_folders(rootFolder, {
            ...this.apiOptions({}),
            max_results: 500,
          });
          const folders = Array.isArray(response.folders)
            ? response.folders
                .map((folder: unknown) =>
                  folder && typeof folder === "object" && "path" in folder
                    ? (folder as { path?: unknown }).path
                    : null,
                )
                .filter(
                  (folder: unknown): folder is string =>
                    typeof folder === "string" &&
                    isValidCloudinaryFolder(folder, rootFolder),
                )
            : [];
          return [rootFolder, ...folders];
        } catch {
          // Keep each configured destination usable if folder browsing is unavailable.
          return [rootFolder];
        }
      }),
    );
    return [...new Set(foldersByRoot.flat())].sort();
  }

  createStorageKey(
    mediaType: string,
    uniqueId: string,
    assetFolder?: string,
  ): string {
    const rootFolders = foldersForInput(this.config, mediaType, assetFolder);
    const folder = assetFolder ?? rootFolders[0];
    if (
      !rootFolders.length ||
      !folder ||
      !rootFolders.some((rootFolder) =>
        isValidCloudinaryFolder(folder, rootFolder),
      )
    ) {
      throw new AppError(
        422,
        "MEDIA_TYPE_UNSUPPORTED",
        "Cloudinary does not support this media type or folder.",
      );
    }
    return `${folder}/${uniqueId}`;
  }

  async headObject(storageKey: string): Promise<UploadedObjectMetadata | null> {
    const resourceType = this.resourceTypeFromKey(storageKey);
    if (!resourceType) throw invalidMediaKey();
    const info = await this.lookup(storageKey, resourceType);
    return info ? cloudinaryMetadata(info) : null;
  }

  async verifyUpload(
    input: VerifyMediaInput,
  ): Promise<UploadedObjectMetadata | null> {
    const resourceType =
      input.resourceType ??
      resourceTypeForMedia(input.mediaType, input.mimeType);
    const rawGenericFile = input.mediaType === "FILE" && resourceType === "raw";
    if (
      !resourceType ||
      resourceType !== resourceTypeForMedia(input.mediaType, input.mimeType) ||
      !isValidCloudinaryPublicId(
        input.storageKey,
        foldersForInput(this.config, input.mediaType, input.assetFolder),
        rawGenericFile,
      ) ||
      input.deliveryType !== "authenticated"
    )
      throw mediaUnavailable("Cloudinary upload delivery metadata is invalid.");
    const info = await this.lookup(input.storageKey, resourceType);
    if (!info) return null;
    const metadata = cloudinaryMetadata(info);
    if (
      info.public_id !== input.storageKey ||
      metadata.resourceType !== resourceType ||
      metadata.deliveryType !== "authenticated" ||
      metadata.contentLength !== input.fileSize ||
      !formatMatchesMedia(
        input.mediaType,
        input.mimeType,
        metadata.format ?? null,
      )
    ) {
      throw new AppError(
        422,
        "UPLOAD_METADATA_MISMATCH",
        "The uploaded Cloudinary asset does not match its media intent.",
      );
    }
    return metadata;
  }

  async verifyImageSignature(input: VerifyMediaInput): Promise<boolean> {
    const signed = await this.signRead({
      storageKey: input.storageKey,
      mimeType: input.mimeType,
      mediaType: input.mediaType,
      ...(input.assetFolder ? { assetFolder: input.assetFolder } : {}),
      resourceType: input.resourceType ?? null,
      deliveryType: input.deliveryType ?? null,
      format: formatForMime(input.mimeType) ?? null,
    });
    try {
      const response = await fetch(signed.url);
      if (!response.ok) return false;
      const contentLength = Number(response.headers.get("content-length"));
      if (Number.isFinite(contentLength) && contentLength !== input.fileSize)
        return false;
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength !== input.fileSize) return false;
      return matchesImageSignature(input.mimeType, bytes);
    } catch {
      throw mediaUnavailable(
        "Uploaded image content could not be inspected with the configured provider.",
      );
    }
  }

  async deleteObject(storageKey: string): Promise<void> {
    const resourceType = this.resourceTypeFromKey(storageKey);
    if (!resourceType) throw invalidMediaKey();
    await this.deleteAsset({
      storageKey,
      resourceType,
      deliveryType: "authenticated",
    });
  }

  async deleteAsset(input: DeleteMediaInput): Promise<void> {
    const resourceType =
      input.resourceType ?? this.resourceTypeFromKey(input.storageKey);
    if (
      !resourceType ||
      (input.deliveryType && input.deliveryType !== "authenticated")
    ) {
      throw mediaUnavailable("Cloudinary deletion metadata is invalid.");
    }
    try {
      const result = await cloudinary.api.delete_resources(
        [input.storageKey],
        this.apiOptions({ resource_type: resourceType, type: "authenticated" }),
      );
      const deleted = result?.deleted?.[input.storageKey];
      if (deleted !== "deleted" && deleted !== "not_found")
        throw new Error("Cloudinary did not confirm the media deletion.");
    } catch {
      throw mediaUnavailable(
        "Media object could not be deleted from the configured provider.",
      );
    }
  }

  private async lookup(publicId: string, resourceType: MediaResourceType) {
    if (!publicId || publicId.trim() !== publicId) throw invalidMediaKey();
    try {
      return await cloudinary.api.resource(
        publicId,
        this.apiOptions({ resource_type: resourceType, type: "authenticated" }),
      );
    } catch (error) {
      if (getHttpStatus(error) === 404) return null;
      throw mediaUnavailable(
        "Cloudinary asset metadata could not be verified.",
      );
    }
  }

  private resourceTypeFromKey(
    storageKey: string,
  ): MediaResourceType | undefined {
    if (
      foldersForMedia(this.config, "PDF").some((folder) =>
        storageKey.startsWith(`${folder}/`),
      ) ||
      foldersForMedia(this.config, "IMAGE").some((folder) =>
        storageKey.startsWith(`${folder}/`),
      ) ||
      storageKey.startsWith(`${PAYMENT_PROOF_FOLDER}/`)
    )
      return "image";
    if (
      foldersForMedia(this.config, "AUDIO").some((folder) =>
        storageKey.startsWith(`${folder}/`),
      )
    )
      return "video";
    return undefined;
  }

  private apiOptions(options: Record<string, unknown>) {
    return {
      cloud_name: this.config.cloudName,
      api_key: this.config.apiKey,
      api_secret: this.config.apiSecret,
      secure: true,
      ...options,
    };
  }
}

export class MediaStorageRouter implements MediaStorageAdapter {
  readonly provider: MediaProvider | undefined;
  private readonly active: MediaStorageAdapter;

  constructor(
    activeProvider: MediaProvider | undefined,
    private readonly providers: Partial<
      Record<MediaProvider, MediaStorageAdapter>
    >,
  ) {
    this.active =
      (activeProvider ? providers[activeProvider] : undefined) ??
      new UnconfiguredMediaStorage();
    this.provider = this.active.provider;
  }

  resolve(provider: MediaProvider): MediaStorageAdapter | undefined {
    return this.providers[provider];
  }

  createStorageKey(
    mediaType: string,
    uniqueId: string,
    assetFolder?: string,
  ): string {
    return (
      this.active.createStorageKey?.(mediaType, uniqueId, assetFolder) ??
      `media/${uniqueId}`
    );
  }

  listUploadFolders(mediaType: string): Promise<string[]> {
    return this.active.listUploadFolders?.(mediaType) ?? Promise.resolve([]);
  }

  signRead(input: SignMediaInput): Promise<SignedMediaUrl> {
    return this.active.signRead(input);
  }

  createUpload(input: CreateUploadInput): Promise<MediaUploadInstructions> {
    return this.active.createUpload!(input);
  }

  headObject(storageKey: string): Promise<UploadedObjectMetadata | null> {
    return this.active.headObject!(storageKey);
  }

  verifyUpload(
    input: VerifyMediaInput,
  ): Promise<UploadedObjectMetadata | null> {
    return this.active.verifyUpload
      ? this.active.verifyUpload(input)
      : this.active.headObject!(input.storageKey);
  }

  verifyImageSignature(input: VerifyMediaInput): Promise<boolean> {
    if (!this.active.verifyImageSignature)
      throw mediaUnavailable(
        "Image signature verification is unavailable for the media provider.",
      );
    return this.active.verifyImageSignature(input);
  }

  deleteObject(storageKey: string): Promise<void> {
    return this.active.deleteObject!(storageKey);
  }

  deleteAsset(input: DeleteMediaInput): Promise<void> {
    if (this.active.deleteAsset) return this.active.deleteAsset(input);
    return this.active.deleteObject!(input.storageKey);
  }
}

export function createMediaStorageAdapter(
  config: AppConfig,
): MediaStorageAdapter {
  const providers: Partial<Record<MediaProvider, MediaStorageAdapter>> = {};
  if (config.mediaStorage)
    providers.S3_COMPATIBLE = new S3CompatibleMediaStorage(config.mediaStorage);
  if (config.cloudinaryMedia)
    providers.CLOUDINARY = new CloudinaryMediaStorage(config.cloudinaryMedia);
  return new MediaStorageRouter(config.mediaProvider, providers);
}

function cloudinaryMetadata(
  info: Record<string, unknown>,
): UploadedObjectMetadata {
  return {
    contentLength: typeof info.bytes === "number" ? info.bytes : null,
    contentType:
      typeof info.format === "string" ? mimeForFormat(info.format) : null,
    providerAssetId: typeof info.asset_id === "string" ? info.asset_id : null,
    resourceType:
      typeof info.resource_type === "string"
        ? (info.resource_type as MediaResourceType)
        : null,
    deliveryType:
      typeof info.type === "string" ? (info.type as MediaDeliveryType) : null,
    format: typeof info.format === "string" ? info.format : null,
    durationSeconds:
      typeof info.duration === "number" && Number.isFinite(info.duration)
        ? info.duration
        : null,
  };
}

function resourceTypeForMedia(
  mediaType?: string,
  mimeType?: string,
): MediaResourceType | undefined {
  if (mediaType === "PDF" || mediaType === "IMAGE") return "image";
  if (mediaType === "AUDIO") return "video";
  if (mediaType === "FILE") {
    if (mimeType?.startsWith("image/") || mimeType === "application/pdf")
      return "image";
    if (mimeType?.startsWith("video/") || mimeType?.startsWith("audio/"))
      return "video";
    return "raw";
  }
  return undefined;
}

function foldersForMedia(
  config: NonNullable<AppConfig["cloudinaryMedia"]>,
  mediaType?: string,
): string[] {
  if (mediaType === "IMAGE") return [config.courseBannerFolder];
  if (mediaType === "PDF") return [config.pdfFolder];
  if (mediaType === "AUDIO")
    return [...new Set([config.audioFolder, config.lessonAudioFolder])];
  if (mediaType === "FILE") return [config.webContentFolder ?? "web-content"];
  return [];
}

function foldersForInput(
  config: NonNullable<AppConfig["cloudinaryMedia"]>,
  mediaType?: string,
  assetFolder?: string,
): string[] {
  if (assetFolder === PAYMENT_PROOF_FOLDER && mediaType === "IMAGE")
    return [PAYMENT_PROOF_FOLDER];
  return foldersForMedia(config, mediaType);
}

function formatForMime(mimeType: string): string | undefined {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "audio/mpeg") return "mp3";
  if (mimeType === "audio/mp4") return "m4a";
  if (mimeType === "audio/wav") return "wav";
  if (mimeType === "audio/ogg") return "ogg";
  return undefined;
}

function mimeForFormat(format: string): string | null {
  if (["jpg", "jpeg"].includes(format)) return "image/jpeg";
  if (format === "png") return "image/png";
  if (format === "webp") return "image/webp";
  if (format === "pdf") return "application/pdf";
  if (["mp3", "mpeg"].includes(format)) return "audio/mpeg";
  if (["m4a", "mp4"].includes(format)) return "audio/mp4";
  if (["wav", "wave"].includes(format)) return "audio/wav";
  if (["ogg", "oga"].includes(format)) return "audio/ogg";
  return null;
}

export function matchesImageSignature(
  mimeType: string,
  bytes: Uint8Array,
): boolean {
  const startsWith = (signature: number[]) =>
    signature.every((value, index) => bytes[index] === value);
  if (mimeType === "image/jpeg")
    return (
      bytes.byteLength >= 5 &&
      startsWith([0xff, 0xd8, 0xff]) &&
      bytes[bytes.byteLength - 2] === 0xff &&
      bytes[bytes.byteLength - 1] === 0xd9
    );
  if (mimeType === "image/png") {
    if (
      bytes.byteLength < 33 ||
      !startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    )
      return false;
    let offset = 8;
    let hasHeader = false;
    let hasData = false;
    let hasEnd = false;
    while (offset + 12 <= bytes.byteLength) {
      const length = readUInt32BE(bytes, offset);
      const chunkEnd = offset + 12 + length;
      if (chunkEnd > bytes.byteLength) return false;
      const type = String.fromCharCode(
        bytes[offset + 4] ?? 0,
        bytes[offset + 5] ?? 0,
        bytes[offset + 6] ?? 0,
        bytes[offset + 7] ?? 0,
      );
      if (type === "IHDR") {
        if (
          length !== 13 ||
          readUInt32BE(bytes, offset + 8) === 0 ||
          readUInt32BE(bytes, offset + 12) === 0
        )
          return false;
        hasHeader = true;
      }
      if (type === "IEND") {
        if (length !== 0 || !hasHeader || !hasData) return false;
        hasEnd = true;
        return chunkEnd === bytes.byteLength;
      }
      if (type === "IDAT" && length > 0) hasData = true;
      offset = chunkEnd;
    }
    return hasHeader && hasEnd;
  }
  if (mimeType === "image/webp") {
    if (
      bytes.byteLength < 20 ||
      !startsWith([0x52, 0x49, 0x46, 0x46]) ||
      bytes[8] !== 0x57 ||
      bytes[9] !== 0x45 ||
      bytes[10] !== 0x42 ||
      bytes[11] !== 0x50
    )
      return false;
    if (readUInt32LE(bytes, 4) + 8 !== bytes.byteLength) return false;
    let offset = 12;
    while (offset + 8 <= bytes.byteLength) {
      const type = String.fromCharCode(
        bytes[offset] ?? 0,
        bytes[offset + 1] ?? 0,
        bytes[offset + 2] ?? 0,
        bytes[offset + 3] ?? 0,
      );
      const length = readUInt32LE(bytes, offset + 4);
      const chunkEnd = offset + 8 + length + (length % 2);
      if (chunkEnd > bytes.byteLength) return false;
      if (type === "VP8 " || type === "VP8L" || type === "VP8X") return true;
      offset = chunkEnd;
    }
  }
  return false;
}

async function readObjectBytes(
  body: unknown,
  expectedLength: number,
): Promise<Uint8Array | null> {
  if (!body || typeof body !== "object" || !(Symbol.asyncIterator in body))
    return null;
  const chunks: Uint8Array[] = [];
  let length = 0;
  for await (const chunk of body as AsyncIterable<Uint8Array | string>) {
    const value =
      typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk;
    chunks.push(value);
    length += value.byteLength;
    if (length > expectedLength || length > 5 * 1024 * 1024) return null;
  }
  if (length !== expectedLength) return null;
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

function readUInt32BE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] ?? 0) * 0x1000000 +
    (bytes[offset + 1] ?? 0) * 0x10000 +
    (bytes[offset + 2] ?? 0) * 0x100 +
    (bytes[offset + 3] ?? 0)
  );
}

function readUInt32LE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] ?? 0) +
    (bytes[offset + 1] ?? 0) * 0x100 +
    (bytes[offset + 2] ?? 0) * 0x10000 +
    (bytes[offset + 3] ?? 0) * 0x1000000
  );
}

function formatMatchesMedia(
  mediaType: string,
  mimeType: string,
  format: string | null,
): boolean {
  if (mediaType === "FILE") return true;
  if (!format) return false;
  return (
    (mediaType === "IMAGE" &&
      ["image/jpeg", "image/png", "image/webp"].includes(mimeType) &&
      mimeForFormat(format) === mimeType) ||
    (mediaType === "PDF" &&
      mimeType === "application/pdf" &&
      format === "pdf") ||
    (mediaType === "AUDIO" && mimeForFormat(format) === mimeType)
  );
}

function getHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  if ("http_code" in error && typeof error.http_code === "number")
    return error.http_code;
  if (
    "$metadata" in error &&
    error.$metadata &&
    typeof error.$metadata === "object"
  )
    return (error.$metadata as { httpStatusCode?: number }).httpStatusCode;
  return undefined;
}

function validateStorageKey(storageKey: string): void {
  if (
    !storageKey ||
    storageKey.trim() !== storageKey ||
    storageKey.startsWith("/") ||
    storageKey.includes("..") ||
    storageKey.includes("\\")
  ) {
    throw invalidMediaKey();
  }
}

function isValidCloudinaryPublicId(
  storageKey: string,
  folders: readonly string[],
  requireExtension = false,
): boolean {
  const validPublicId = requireExtension
    ? /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.[A-Za-z0-9]{1,16}$/.test(
        storageKey,
      )
    : /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(storageKey);
  return (
    typeof storageKey === "string" &&
    storageKey.length <= 255 &&
    validPublicId &&
    folders.some((folder) => storageKey.startsWith(`${folder}/`))
  );
}

function isValidCloudinaryFolder(folder: string, rootFolder: string): boolean {
  return (
    /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(folder) &&
    (folder === rootFolder || folder.startsWith(`${rootFolder}/`))
  );
}

function invalidMediaKey(): AppError {
  return new AppError(
    503,
    "MEDIA_STORAGE_UNAVAILABLE",
    "The media object key is invalid for the configured provider.",
  );
}

function mediaUnavailable(
  message = "Media storage is not configured.",
): AppError {
  return new AppError(503, "MEDIA_STORAGE_UNAVAILABLE", message);
}
