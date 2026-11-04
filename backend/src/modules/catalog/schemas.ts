import { z } from "zod";

export const courseListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  level: z.string().trim().min(1).max(32).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  sort: z
    .enum(["sortOrder", "newest", "title", "price_asc", "price_desc"])
    .default("sortOrder"),
});

export const courseSlugParamsSchema = z.strictObject({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});
export const mediaAssetParamsSchema = z.strictObject({
  assetId: z.string().regex(/^[a-fA-F0-9]{24}$/),
});
