import { describe, expect, it } from "vitest";
import { paymentProofUploadIntentSchema } from "../../src/modules/commerce/schemas.js";
import { matchesImageSignature } from "../../src/modules/learning/media-storage.js";

describe("payment proof validation", () => {
  it("accepts the supported image formats and rejects oversized files", () => {
    expect(
      paymentProofUploadIntentSchema.safeParse({
        originalName: "receipt.jpeg",
        mimeType: "image/jpeg",
        fileSize: 5 * 1024 * 1024,
      }).success,
    ).toBe(true);
    expect(
      paymentProofUploadIntentSchema.safeParse({
        originalName: "receipt.png",
        mimeType: "image/png",
        fileSize: 5 * 1024 * 1024 + 1,
      }).success,
    ).toBe(false);
  });

  it("requires an extension matching the declared MIME type", () => {
    expect(
      paymentProofUploadIntentSchema.safeParse({
        originalName: "receipt.exe",
        mimeType: "image/png",
        fileSize: 100,
      }).success,
    ).toBe(false);
    expect(
      paymentProofUploadIntentSchema.safeParse({
        originalName: "receipt.webp",
        mimeType: "image/webp",
        fileSize: 100,
      }).success,
    ).toBe(true);
  });

  it("checks actual JPG, PNG and WebP file signatures", () => {
    const jpeg = Uint8Array.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xff, 0xd9,
    ]);
    const png = Uint8Array.from(
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64",
      ),
    );
    const webp = Uint8Array.from([
      0x52, 0x49, 0x46, 0x46, 16, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50,
      0x38, 0x20, 4, 0, 0, 0, 0, 0, 0, 0,
    ]);
    expect(matchesImageSignature("image/jpeg", jpeg)).toBe(true);
    expect(matchesImageSignature("image/png", png)).toBe(true);
    expect(matchesImageSignature("image/webp", webp)).toBe(true);
    expect(
      matchesImageSignature("image/png", Uint8Array.from([0xff, 0xd8, 0xff])),
    ).toBe(false);
  });
});
