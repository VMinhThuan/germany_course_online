import { z } from "zod";

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/);

export const courseIdParams = z.object({ courseId: objectId }).strict();
export const sectionParams = z
  .object({ courseId: objectId, sectionId: objectId })
  .strict();
export const lessonParams = z.object({ lessonId: objectId }).strict();
export const exerciseParams = z.object({ exerciseId: objectId }).strict();
export const attemptParams = z.object({ attemptId: objectId }).strict();
export const answerParams = z
  .object({ attemptId: objectId, questionId: objectId })
  .strict();

export const myCoursesQuery = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(["ACTIVE", "REVOKED"]).optional(),
  })
  .strict();

export const saveLessonNoteBody = z
  .object({ content: z.string().max(10_000) })
  .strict();

export const mediaAccessBody = z
  .object({
    assetId: objectId,
    lessonId: objectId.nullable().optional(),
    exerciseId: objectId.nullable().optional(),
  })
  .strict()
  .refine(
    (value) => Boolean(value.lessonId) !== Boolean(value.exerciseId),
    "Exactly one of lessonId or exerciseId is required.",
  );

export const selectQuizAnswerBody = z
  .object({ selectedOptionId: objectId })
  .strict();

export const idempotencyKeySchema = z.string().min(8).max(128);

export type MyCoursesQuery = z.infer<typeof myCoursesQuery>;
export type MediaAccessBody = z.infer<typeof mediaAccessBody>;
