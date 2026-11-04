import { describe, expect, it } from "vitest";
import {
  S3CompatibleMediaStorage,
  UnconfiguredMediaStorage,
} from "../../src/modules/learning/media-storage.js";

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
});
