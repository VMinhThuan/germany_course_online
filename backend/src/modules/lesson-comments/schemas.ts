import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const cursor = z
  .string()
  .min(1)
  .max(512)
  .regex(/^[A-Za-z\d_-]+$/);

export const lessonParams = z.object({ lessonId: objectId });
export const commentParams = z.object({ commentId: objectId });
export const listCommentsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(30).default(20),
  cursor: cursor.optional(),
  sort: z.enum(["newest", "oldest"]).default("newest"),
});
export const repliesQuery = z.object({
  limit: z.coerce.number().int().min(1).max(30).default(20),
  cursor: cursor.optional(),
  sort: z.enum(["newest", "oldest"]).default("oldest"),
});
export const createCommentBody = z
  .object({
    content: z.string().trim().min(1).max(2_000),
    isAnonymous: z.boolean().default(false),
    parentId: objectId.nullable().default(null),
  })
  .strict();
export const editCommentBody = z
  .object({
    content: z.string().trim().min(1).max(2_000),
    expectedRevision: z.number().int().min(1),
    reason: z.string().trim().max(300).optional(),
  })
  .strict();
export const reactionBody = z
  .object({ reactionType: z.enum(["LIKE", "LOVE", "HAHA", "WOW", "CLAP"]) })
  .strict();
export const deleteCommentBody = z
  .object({ reason: z.string().trim().max(300).optional() })
  .strict()
  .default({});

export const adminListCommentsQuery = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    courseId: objectId.optional(),
    lessonId: objectId.optional(),
    authorId: objectId.optional(),
    anonymous: z.enum(["true", "false"]).optional(),
    status: z.enum(["ACTIVE", "DELETED", "ALL"]).default("ALL"),
    type: z.enum(["ROOT", "REPLY", "ALL"]).default("ALL"),
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
    search: z.string().trim().min(1).max(120).optional(),
    sort: z.enum(["newest", "oldest"]).default("newest"),
  })
  .refine(
    (value) =>
      !value.from ||
      !value.to ||
      Date.parse(value.from) <= Date.parse(value.to),
    { path: ["to"], message: "The end date must follow the start date." },
  );
