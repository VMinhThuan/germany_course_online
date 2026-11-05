import { describe, expect, it, vi } from "vitest";
import { v2 as cloudinary } from "cloudinary";
import { parseEnvironment } from "../../src/config/env.js";
import {
  CloudinaryMediaStorage,
  createMediaStorageAdapter,
  S3CompatibleMediaStorage,
  UnconfiguredMediaStorage,
} from "../../src/modules/learning/media-storage.js";

const cloudinaryTestConfig = {
  cloudName: "cloud-test-123",
  apiKey: "test-api-key",
  apiSecret: "test-only-cloudinary-secret",
  pdfFolder: "lesson-pdf",
  audioFolder: "quiz-audio",
  folderMode: "dynamic" as const,
  signedUrlTtlSeconds: 180,
};

const baseEnvironment = {
  NODE_ENV: "test",
  MONGODB_URI: "mongodb://127.0.0.1:27017",
  MONGODB_DB_NAME: "paniverse_test",
  JWT_ACCESS_SECRET: "test-only-signing-secret-at-least-32-chars",
  JWT_ISSUER: "https://api.test.invalid",
  JWT_AUDIENCE: "test-client",
  APP_ORIGINS: "http://localhost:5173",
};

describe("learning media storage adapters", () => {
  it("signs a private S3-compatible GET URL with the configured TTL and response headers", async () => {
    const storage = new S3CompatibleMediaStorage({
      endpoint: "https://objects.example.test",
      bucket: "private-course-media",
      region: "us-east-1",
      accessKeyId: "TESTACCESSKEY",
      secretAccessKey: "test-secret-key-not-used-outside-signing",
      signedUrlTtlSeconds: 240,
    });
    try {
      const signed = await storage.signRead({
        storageKey: "course/lesson answer.pdf",
        mimeType: "application/pdf",
      });
      const url = new URL(signed.url);
      expect(url.origin).toBe("https://objects.example.test");
      expect(url.pathname).toContain("private-course-media");
      expect(decodeURIComponent(url.pathname)).toContain(
        "course/lesson answer.pdf",
      );
      expect(url.searchParams.get("X-Amz-Expires")).toBe("240");
      expect(url.searchParams.get("response-content-type")).toBe(
        "application/pdf",
      );
      expect(url.searchParams.get("response-cache-control")).toBe(
        "private, no-store",
      );
      expect(signed.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(signed.url).not.toContain(
        "test-secret-key-not-used-outside-signing",
      );
    } finally {
      storage.destroy();
    }
  });

  it("returns an explicit unavailable error when unconfigured or given an invalid object key", async () => {
    await expect(
      new UnconfiguredMediaStorage().signRead({
        storageKey: "private/file.pdf",
        mimeType: "application/pdf",
      }),
    ).rejects.toMatchObject({
      statusCode: 503,
      code: "MEDIA_STORAGE_UNAVAILABLE",
    });

    const storage = new S3CompatibleMediaStorage({
      endpoint: "https://objects.example.test",
      bucket: "private-course-media",
      region: "us-east-1",
      accessKeyId: "TESTACCESSKEY",
      secretAccessKey: "test-secret-key-not-used-outside-signing",
      signedUrlTtlSeconds: 300,
    });
    try {
      await expect(
        storage.signRead({
          storageKey: " private/file.pdf",
          mimeType: "application/pdf",
        }),
      ).rejects.toMatchObject({
        statusCode: 503,
        code: "MEDIA_STORAGE_UNAVAILABLE",
      });
    } finally {
      storage.destroy();
    }
  });

  it("creates a signed Cloudinary multipart intent with stable private identity", async () => {
    const now = new Date("2026-11-04T00:00:00.500Z");
    const storage = new CloudinaryMediaStorage(cloudinaryTestConfig, () => now);
    const intent = await storage.createUpload({
      storageKey: "lesson-pdf/65aabbccddeeff0011223344",
      mimeType: "application/pdf",
      fileSize: 1024,
      expiresInSeconds: 600,
      mediaType: "PDF",
      resourceType: "image",
      deliveryType: "authenticated",
      assetFolder: "lesson-pdf",
    });

    expect(intent).toMatchObject({ provider: "CLOUDINARY", method: "POST" });
    expect(intent.url).toBe(
      "https://api.cloudinary.com/v1_1/cloud-test-123/image/upload",
    );
    expect(intent.fields).toMatchObject({
      public_id: "lesson-pdf/65aabbccddeeff0011223344",
      type: "authenticated",
      overwrite: "false",
      asset_folder: "lesson-pdf",
      api_key: cloudinaryTestConfig.apiKey,
    });
    const fields = intent.fields!;
    expect(fields.signature).toBe(
      cloudinary.utils.api_sign_request(
        {
          timestamp: Number(fields.timestamp),
          public_id: fields.public_id,
          type: fields.type,
          overwrite: false,
          asset_folder: fields.asset_folder,
        },
        cloudinaryTestConfig.apiSecret,
      ),
    );
    expect(intent.expiresAt.toISOString()).toBe("2026-11-04T01:00:00.000Z");
    expect(JSON.stringify(intent)).not.toContain(
      cloudinaryTestConfig.apiSecret,
    );
  });

  it("switches Cloudinary accounts without changing canonical IDs and keeps provider routing available", async () => {
    const createAccountAdapter = (cloudName: string, apiKey: string) =>
      createMediaStorageAdapter(
        parseEnvironment({
          ...baseEnvironment,
          MEDIA_PROVIDER: "CLOUDINARY",
          CLOUDINARY_CLOUD_NAME: cloudName,
          CLOUDINARY_API_KEY: apiKey,
          CLOUDINARY_API_SECRET: `test-secret-${cloudName}`,
        }),
      );
    const source = createAccountAdapter("source-cloud-test", "source-key");
    const target = createAccountAdapter("target-cloud-test", "target-key");
    const input = {
      storageKey: "lesson-pdf/65aabbccddeeff0011223344",
      mimeType: "application/pdf",
      fileSize: 1024,
      expiresInSeconds: 600,
      mediaType: "PDF",
      resourceType: "image" as const,
      deliveryType: "authenticated" as const,
      assetFolder: "lesson-pdf",
    };

    const sourceIntent = await source.createUpload!(input);
    const targetIntent = await target.createUpload!(input);

    expect(source.provider).toBe("CLOUDINARY");
    expect(target.provider).toBe("CLOUDINARY");
    expect(source.resolve?.("CLOUDINARY")).toBeDefined();
    expect(target.resolve?.("CLOUDINARY")).toBeDefined();
    expect(sourceIntent.url).toContain("source-cloud-test");
    expect(targetIntent.url).toContain("target-cloud-test");
    expect(sourceIntent.fields?.public_id).toBe(input.storageKey);
    expect(targetIntent.fields?.public_id).toBe(input.storageKey);
    expect(sourceIntent.fields?.api_key).toBe("source-key");
    expect(targetIntent.fields?.api_key).toBe("target-key");
    expect(targetIntent.fields?.signature).not.toBe(
      sourceIntent.fields?.signature,
    );
  });

  it("returns an expiring authenticated Cloudinary read URL using only the selected media type", async () => {
    const now = new Date("2026-11-04T00:00:00.000Z");
    const storage = new CloudinaryMediaStorage(cloudinaryTestConfig, () => now);
    const signed = await storage.signRead({
      storageKey: "lesson-pdf/65aabbccddeeff0011223344",
      mimeType: "application/pdf",
      mediaType: "PDF",
      resourceType: "image",
      deliveryType: "authenticated",
      format: "pdf",
    });
    const url = new URL(signed.url);
    expect(signed.expiresAt.toISOString()).toBe("2026-11-04T00:03:00.000Z");
    expect(url.hostname).toBe("api.cloudinary.com");
    expect(url.searchParams.get("expires_at")).toBe(
      String(Math.floor(signed.expiresAt.getTime() / 1000)),
    );
    expect(url.searchParams.get("api_key")).toBe(cloudinaryTestConfig.apiKey);
    expect(signed.url).not.toContain(cloudinaryTestConfig.apiSecret);
    await expect(
      storage.signRead({
        storageKey: "lesson-pdf/65aabbccddeeff0011223344",
        mimeType: "application/pdf",
        mediaType: "PDF",
        resourceType: "video",
        deliveryType: "authenticated",
        format: "pdf",
      }),
    ).rejects.toMatchObject({ code: "MEDIA_STORAGE_UNAVAILABLE" });
  });

  it("confirms Cloudinary resource type, authenticated delivery, size, and exact format", async () => {
    const storage = new CloudinaryMediaStorage(cloudinaryTestConfig);
    const resource = vi.spyOn(cloudinary.api, "resource").mockResolvedValue({
      public_id: "lesson-pdf/65aabbccddeeff0011223344",
      resource_type: "image",
      type: "authenticated",
      format: "pdf",
      bytes: 1024,
      asset_id: "provider-id-not-returned",
    } as never);
    try {
      const metadata = await storage.verifyUpload({
        storageKey: "lesson-pdf/65aabbccddeeff0011223344",
        mimeType: "application/pdf",
        fileSize: 1024,
        mediaType: "PDF",
        resourceType: "image",
        deliveryType: "authenticated",
      });
      expect(metadata).toMatchObject({
        contentLength: 1024,
        contentType: "application/pdf",
        resourceType: "image",
        deliveryType: "authenticated",
        format: "pdf",
      });
      expect(metadata).not.toHaveProperty("asset_id");
      await expect(
        storage.verifyUpload({
          storageKey: "lesson-pdf/65aabbccddeeff0011223344",
          mimeType: "image/png",
          fileSize: 1024,
          mediaType: "PDF",
          resourceType: "image",
          deliveryType: "authenticated",
        }),
      ).rejects.toMatchObject({ code: "UPLOAD_METADATA_MISMATCH" });
    } finally {
      resource.mockRestore();
    }
  });
});
