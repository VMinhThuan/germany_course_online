import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { AppConfig } from "../../config/env.js";
import { AppError } from "../../shared/errors.js";

export type SignedMediaUrl = {
  url: string;
  expiresAt: Date;
};

export type SignMediaInput = {
  storageKey: string;
  mimeType: string;
};

export type CreateUploadInput = {
  storageKey: string;
  mimeType: string;
  fileSize: number;
  expiresInSeconds: number;
};

export type UploadedObjectMetadata = {
  contentLength: number | null;
  contentType: string | null;
};

export interface MediaStorageAdapter {
  signRead(input: SignMediaInput): Promise<SignedMediaUrl>;
  createUpload?(input: CreateUploadInput): Promise<SignedMediaUrl>;
  headObject?(storageKey: string): Promise<UploadedObjectMetadata | null>;
  deleteObject?(storageKey: string): Promise<void>;
}

export class UnconfiguredMediaStorage implements MediaStorageAdapter {
  async signRead(_input: SignMediaInput): Promise<SignedMediaUrl> {
    throw mediaUnavailable();
  }

  async createUpload(_input: CreateUploadInput): Promise<SignedMediaUrl> {
    throw mediaUnavailable();
  }

  async headObject(
    _storageKey: string,
  ): Promise<UploadedObjectMetadata | null> {
    throw mediaUnavailable();
  }

  async deleteObject(_storageKey: string): Promise<void> {
    throw mediaUnavailable();
  }
}

export class S3CompatibleMediaStorage implements MediaStorageAdapter {
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
      throw new AppError(
        503,
        "MEDIA_STORAGE_UNAVAILABLE",
        "The protected media object is not configured for delivery.",
      );
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

  async createUpload(input: CreateUploadInput): Promise<SignedMediaUrl> {
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
      url,
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
      const status =
        typeof error === "object" && error !== null && "$metadata" in error
          ? (error.$metadata as { httpStatusCode?: number } | undefined)
              ?.httpStatusCode
          : undefined;
      if (status === 404) return null;
      throw new AppError(
        503,
        "MEDIA_STORAGE_UNAVAILABLE",
        "Uploaded media could not be verified with the configured provider.",
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
      throw new AppError(
        503,
        "MEDIA_STORAGE_UNAVAILABLE",
        "Media object could not be deleted from the configured provider.",
      );
    }
  }

  destroy(): void {
    this.client.destroy();
  }
}

function validateStorageKey(storageKey: string): void {
  if (
    !storageKey ||
    storageKey.trim() !== storageKey ||
    storageKey.startsWith("/") ||
    storageKey.includes("..") ||
    storageKey.includes("\\")
  ) {
    throw new AppError(
      503,
      "MEDIA_STORAGE_UNAVAILABLE",
      "The media object key is invalid for the configured provider.",
    );
  }
}

function mediaUnavailable(): AppError {
  return new AppError(
    503,
    "MEDIA_STORAGE_UNAVAILABLE",
    "Media storage is not configured.",
  );
}

export function createMediaStorageAdapter(
  config: AppConfig,
): MediaStorageAdapter {
  if (!config.mediaStorage) return new UnconfiguredMediaStorage();
  return new S3CompatibleMediaStorage(config.mediaStorage);
}
