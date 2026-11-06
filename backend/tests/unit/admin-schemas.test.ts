import { describe, expect, it } from "vitest";
import { uploadIntentSchema } from "../../src/modules/admin/schemas.js";

describe("media upload intent validation", () => {
  const baseInput = {
    mediaType: "IMAGE",
    originalName: "banner.webp",
    mimeType: "image/webp",
    fileSize: 1024,
    visibility: "PUBLIC",
  };

  it("accepts a file when its extension and content type match the selected media type", () => {
    expect(uploadIntentSchema.safeParse(baseInput).success).toBe(true);
  });

  it("rejects an extension that does not match its media type before creating an upload", () => {
    const result = uploadIntentSchema.safeParse({
      ...baseInput,
      originalName: "banner.pdf",
    });
    expect(result.success).toBe(false);
  });

  it("validates the audio formats used by lesson attachments", () => {
    expect(
      uploadIntentSchema.safeParse({
        ...baseInput,
        mediaType: "AUDIO",
        originalName: "prompt.mp3",
        mimeType: "audio/mpeg",
      }).success,
    ).toBe(true);
    expect(
      uploadIntentSchema.safeParse({
        ...baseInput,
        mediaType: "AUDIO",
        originalName: "prompt.pdf",
        mimeType: "audio/mpeg",
      }).success,
    ).toBe(false);
  });
});
