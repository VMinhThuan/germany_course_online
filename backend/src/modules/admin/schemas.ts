import { z } from "zod";

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/);
const page = z.coerce.number().int().min(1).max(1_000_000).default(1);
const pageSize = z.coerce.number().int().min(1).max(100).default(20);
const text = (max: number) => z.string().trim().max(max);
const nullableText = (max: number) => text(max).nullable();
const assetId = objectId.nullable();
const status = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
const contentStatus = z.enum(["DRAFT", "PUBLISHED", "HIDDEN"]);

export const pageQuerySchema = z.strictObject({ page, pageSize });
export const courseListQuerySchema = z.strictObject({
  page,
  pageSize,
  status: status.optional(),
  q: text(120).optional(),
});
export const sectionListQuerySchema = z.strictObject({
  page,
  pageSize,
  status: contentStatus.optional(),
});
export const lessonListQuerySchema = sectionListQuerySchema;
export const exerciseListQuerySchema = sectionListQuerySchema;

const courseWriteFields = {
  code: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/),
  title: text(180).min(1),
  description: text(10_000),
  shortDescription: text(500),
  objectives: z.array(text(300).min(1)).max(30),
  requirements: z.array(text(300).min(1)).max(30),
  level: z.string().trim().min(1).max(20),
  thumbnailAssetId: assetId.optional(),
  bannerAssetId: assetId.optional(),
  introVideoAssetId: assetId.optional(),
  price: z.string().regex(/^(0|[1-9]\d{0,11})$/),
  accessDurationMonths: z.number().int().min(1).max(120),
  sortOrder: z.number().int().min(0).max(1_000_000),
};
export const createCourseSchema = z.strictObject({
  ...courseWriteFields,
  code: courseWriteFields.code,
  slug: courseWriteFields.slug,
  title: courseWriteFields.title,
  description: courseWriteFields.description,
  shortDescription: courseWriteFields.shortDescription,
  level: courseWriteFields.level,
  price: courseWriteFields.price,
  accessDurationMonths: courseWriteFields.accessDurationMonths,
});
export const coursePatchSchema = z
  .strictObject({
    code: courseWriteFields.code.optional(),
    slug: courseWriteFields.slug.optional(),
    title: courseWriteFields.title.optional(),
    description: courseWriteFields.description.optional(),
    shortDescription: courseWriteFields.shortDescription.optional(),
    objectives: courseWriteFields.objectives.optional(),
    requirements: courseWriteFields.requirements.optional(),
    level: courseWriteFields.level.optional(),
    thumbnailAssetId: assetId.optional(),
    bannerAssetId: assetId.optional(),
    introVideoAssetId: assetId.optional(),
    price: courseWriteFields.price.optional(),
    accessDurationMonths: courseWriteFields.accessDurationMonths.optional(),
    sortOrder: courseWriteFields.sortOrder.optional(),
    status: z.enum(["DRAFT", "ARCHIVED"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0);

export const courseIdParamsSchema = z.strictObject({ courseId: objectId });
export const sectionIdParamsSchema = z.strictObject({ sectionId: objectId });
export const lessonIdParamsSchema = z.strictObject({ lessonId: objectId });
export const exerciseIdParamsSchema = z.strictObject({ exerciseId: objectId });
export const assetIdParamsSchema = z.strictObject({ assetId: objectId });
export const lessonAssetParamsSchema = z.strictObject({
  lessonId: objectId,
  assetId: objectId,
});
export const exerciseAssetParamsSchema = z.strictObject({
  exerciseId: objectId,
  assetId: objectId,
});
export const userIdParamsSchema = z.strictObject({ userId: objectId });
export const enrollmentIdParamsSchema = z.strictObject({
  enrollmentId: objectId,
});
export const sessionIdParamsSchema = z.strictObject({ sessionId: objectId });
export const associationParamsSchema = z
  .strictObject({
    lessonId: objectId.optional(),
    exerciseId: objectId.optional(),
    assetId: objectId,
  })
  .refine((value) => Boolean(value.lessonId) !== Boolean(value.exerciseId));

export const createSectionSchema = z.strictObject({
  title: text(180).min(1),
  description: nullableText(2_000).optional(),
  sectionType: z.enum(["CHAPTER", "EXAM_PREP"]),
  sortOrder: z.number().int().min(0).max(1_000_000),
  status: contentStatus,
});
export const sectionPatchSchema = z
  .strictObject({
    title: text(180).min(1).optional(),
    description: nullableText(2_000).optional(),
    sectionType: z.enum(["CHAPTER", "EXAM_PREP"]).optional(),
    sortOrder: z.number().int().min(0).max(1_000_000).optional(),
    status: contentStatus.optional(),
  })
  .refine((value) => Object.keys(value).length > 0);

const lessonContent = z
  .strictObject({
    version: z.literal(1),
    paragraphs: z
      .array(
        text(4_000).refine((paragraph) => !/<\/?[a-z][^>]*>/i.test(paragraph)),
      )
      .max(100),
  })
  .nullable();
const lessonVideo = z.strictObject({
  provider: z.literal("YOUTUBE"),
  videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
});
export const createLessonSchema = z
  .strictObject({
    title: text(180).min(1),
    description: nullableText(2_000).optional(),
    content: lessonContent.optional(),
    video: lessonVideo.nullable().optional(),
    solutionVideo: lessonVideo.nullable().optional(),
    lessonType: z.enum(["LECTURE", "PRACTICE"]),
    estimatedMinutes: z.number().int().min(0).max(1440).nullable().optional(),
    countsTowardProgress: z.boolean(),
    sortOrder: z.number().int().min(0).max(1_000_000),
    status: contentStatus,
  })
  .superRefine((value, ctx) => {
    if (value.content && JSON.stringify(value.content).length > 65_536)
      ctx.addIssue({
        code: "custom",
        path: ["content"],
        message: "Content exceeds 64 KiB.",
      });
  });
export const lessonPatchSchema = z
  .strictObject({
    title: text(180).min(1).optional(),
    description: nullableText(2_000).optional(),
    content: lessonContent.optional(),
    video: lessonVideo.nullable().optional(),
    solutionVideo: lessonVideo.nullable().optional(),
    lessonType: z.enum(["LECTURE", "PRACTICE"]).optional(),
    estimatedMinutes: z.number().int().min(0).max(1440).nullable().optional(),
    countsTowardProgress: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(1_000_000).optional(),
    status: contentStatus.optional(),
  })
  .refine((value) => Object.keys(value).length > 0)
  .superRefine((value, ctx) => {
    if (value.content && JSON.stringify(value.content).length > 65_536)
      ctx.addIssue({
        code: "custom",
        path: ["content"],
        message: "Content exceeds 64 KiB.",
      });
  });

const exerciseFields = {
  title: text(180).min(1),
  description: nullableText(2_000).optional(),
  instructions: z.string().trim().min(1).max(20_000),
  exerciseType: z.enum(["FILE_BASED", "QUIZ"]),
  completionMode: z.enum(["MANUAL", "QUIZ_SUBMISSION"]),
  isRequired: z.boolean(),
  sortOrder: z.number().int().min(0).max(1_000_000),
  status: contentStatus,
};
function validateExercise(
  value: {
    exerciseType?: "FILE_BASED" | "QUIZ" | undefined;
    completionMode?: "MANUAL" | "QUIZ_SUBMISSION" | undefined;
  },
  ctx: z.RefinementCtx,
) {
  if (value.exerciseType && value.completionMode) {
    const valid =
      (value.exerciseType === "FILE_BASED" &&
        value.completionMode === "MANUAL") ||
      (value.exerciseType === "QUIZ" &&
        value.completionMode === "QUIZ_SUBMISSION");
    if (!valid)
      ctx.addIssue({
        code: "custom",
        path: ["completionMode"],
        message: "Exercise type and completion mode are incompatible.",
      });
  }
}
export const createExerciseSchema = z
  .strictObject(exerciseFields)
  .superRefine(validateExercise);
export const exercisePatchSchema = z
  .strictObject({
    lessonId: objectId.optional(),
    title: exerciseFields.title.optional(),
    description: exerciseFields.description,
    instructions: exerciseFields.instructions.optional(),
    exerciseType: exerciseFields.exerciseType.optional(),
    completionMode: exerciseFields.completionMode.optional(),
    isRequired: exerciseFields.isRequired.optional(),
    sortOrder: exerciseFields.sortOrder.optional(),
    status: exerciseFields.status.optional(),
  })
  .refine((value) => Object.keys(value).length > 0)
  .superRefine(validateExercise);

const quizOption = z.strictObject({
  id: objectId.optional(),
  optionText: text(1_000).min(1),
  isCorrect: z.boolean(),
  sortOrder: z.number().int().min(0).max(10_000),
});
const quizQuestion = z
  .strictObject({
    id: objectId.optional(),
    questionText: text(4_000).min(1),
    questionType: z.literal("SINGLE_CHOICE").default("SINGLE_CHOICE"),
    explanation: nullableText(4_000).optional(),
    points: z.string().regex(/^(0|[1-9]\d{0,5})(\.\d{1,2})?$/),
    sortOrder: z.number().int().min(0).max(10_000),
    options: z.array(quizOption).min(2).max(20),
  })
  .superRefine((question, ctx) => {
    if (question.options.filter((option) => option.isCorrect).length !== 1)
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Exactly one option must be correct.",
      });
  });
export const quizWriteSchema = z
  .strictObject({
    title: text(180).min(1),
    description: nullableText(4_000).optional(),
    passScorePercent: z.number().min(0).max(100).nullable().optional(),
    showCorrectAnswers: z.boolean(),
    questions: z.array(quizQuestion).min(1).max(100),
  })
  .superRefine((quiz, ctx) => {
    const ids = new Set<string>();
    for (const question of quiz.questions) {
      for (const id of [
        question.id,
        ...question.options.map((option) => option.id),
      ]) {
        if (!id) continue;
        if (ids.has(id))
          ctx.addIssue({
            code: "custom",
            path: ["questions"],
            message: "Quiz item ids must be unique.",
          });
        ids.add(id);
      }
    }
    if (JSON.stringify(quiz).length > 200_000)
      ctx.addIssue({
        code: "custom",
        path: [],
        message: "Quiz exceeds 200 KiB.",
      });
  });

const mimeByType = {
  IMAGE: ["image/jpeg", "image/png", "image/webp"],
  VIDEO: ["video/mp4"],
  AUDIO: ["audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg"],
  PDF: ["application/pdf"],
} as const;
const MAX_WEB_CONTENT_FILE_BYTES = 100_000_000;
export const uploadIntentSchema = z
  .strictObject({
    originalName: z.string().trim().min(1).max(255),
    mediaType: z.enum(["IMAGE", "VIDEO", "AUDIO", "PDF", "FILE"]),
    mimeType: z.string().trim().toLowerCase().max(160),
    fileSize: z.number().int().min(1),
    visibility: z.enum(["PUBLIC", "ENROLLED"]),
    assetFolder: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .regex(/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/)
      .optional(),
  })
  .superRefine((value, ctx) => {
    const isGenericFile = value.mediaType === "FILE";
    const allowed: readonly string[] =
      value.mediaType === "FILE" ? [] : mimeByType[value.mediaType];
    if (
      (isGenericFile &&
        !/^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/.test(
          value.mimeType,
        )) ||
      (!isGenericFile && !allowed.includes(value.mimeType))
    )
      ctx.addIssue({
        code: "custom",
        path: ["mimeType"],
        message: isGenericFile
          ? "MIME type is invalid."
          : "MIME type is not allowed for this media type.",
      });
    const extension = value.originalName.split(".").at(-1)?.toLowerCase();
    const extensionMime: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      mp4: value.mediaType === "AUDIO" ? "audio/mp4" : "video/mp4",
      mp3: "audio/mpeg",
      m4a: "audio/mp4",
      wav: "audio/wav",
      wave: "audio/wav",
      ogg: "audio/ogg",
      oga: "audio/ogg",
      pdf: "application/pdf",
    };
    const validExtension = isGenericFile
      ? Boolean(extension && /^[a-z0-9]{1,16}$/.test(extension))
      : Boolean(extension && extensionMime[extension] === value.mimeType);
    if (!validExtension)
      ctx.addIssue({
        code: "custom",
        path: ["originalName"],
        message: isGenericFile
          ? "File must have a safe extension."
          : "File extension does not match its media type.",
      });
    const maxBytes: Record<string, number> = {
      IMAGE: 20 * 1024 * 1024,
      VIDEO: 250 * 1024 * 1024,
      AUDIO: 50 * 1024 * 1024,
      PDF: 40 * 1024 * 1024,
      FILE: MAX_WEB_CONTENT_FILE_BYTES,
    };
    if (value.fileSize > maxBytes[value.mediaType]!)
      ctx.addIssue({
        code: "custom",
        path: ["fileSize"],
        message: "File exceeds the media type size limit.",
      });
  });
export const uploadCompleteSchema = z.strictObject({
  providerUploadId: text(200).optional(),
});
export const mediaListQuerySchema = z.strictObject({
  page,
  pageSize,
  q: text(120).optional(),
  mediaType: z.enum(["IMAGE", "VIDEO", "AUDIO", "PDF", "FILE"]).optional(),
  visibility: z.enum(["PUBLIC", "ENROLLED"]).optional(),
  uploadStatus: z.enum(["PENDING", "READY", "DELETING", "DELETED"]).optional(),
  provider: z.enum(["S3_COMPATIBLE", "CLOUDINARY"]).optional(),
});
export const associationWriteSchema = z.strictObject({
  assetRole: z.enum([
    "LECTURE_VIDEO",
    "LECTURE_PDF",
    "ATTACHMENT",
    "QUESTION_PDF",
    "QUESTION_AUDIO",
    "ANSWER_PDF",
    "SOLUTION_VIDEO",
  ]),
  title: nullableText(180).optional(),
  sortOrder: z.number().int().min(0).max(1_000_000),
});
export const associationDeleteQuerySchema = z.strictObject({
  assetRole: z.enum([
    "LECTURE_VIDEO",
    "LECTURE_PDF",
    "ATTACHMENT",
    "QUESTION_PDF",
    "QUESTION_AUDIO",
    "ANSWER_PDF",
    "SOLUTION_VIDEO",
  ]),
});

export const studentListQuerySchema = z.strictObject({
  page,
  pageSize,
  q: text(120).optional(),
  status: z.enum(["ACTIVE", "BLOCKED"]).optional(),
});
export const studentStatusSchema = z.strictObject({
  status: z.enum(["ACTIVE", "BLOCKED"]),
});
export const enrollmentListQuerySchema = z.strictObject({
  page,
  pageSize,
  userId: objectId.optional(),
  courseId: objectId.optional(),
  status: z.enum(["ACTIVE", "REVOKED", "EXPIRED"]).optional(),
});
const wholeVnd = z.string().regex(/^(0|[1-9]\d{0,11})$/);
const positiveMonths = z.number().int().min(1).max(120);
export const renewalPlanListQuerySchema = z.strictObject({
  page,
  pageSize,
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});
export const renewalPlanCreateSchema = z
  .strictObject({
    title: text(180).min(1),
    durationMonths: positiveMonths,
    price: wholeVnd,
    status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
    sortOrder: z.number().int().min(0).max(1_000_000).default(0),
  })
  .refine((value) => value.price !== "0", {
    path: ["price"],
    message: "Paid renewal plans require a positive price.",
  });
export const renewalPlanPatchSchema = z
  .strictObject({
    title: text(180).min(1).optional(),
    durationMonths: positiveMonths.optional(),
    price: wholeVnd.optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    sortOrder: z.number().int().min(0).max(1_000_000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0)
  .refine((value) => value.price === undefined || value.price !== "0", {
    path: ["price"],
    message: "Paid renewal plans require a positive price.",
  });
export const renewalPlanIdParamsSchema = z.strictObject({ planId: objectId });
export const couponListQuerySchema = z.strictObject({
  page,
  pageSize,
  q: text(80).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});
const decimalDiscount = z.string().regex(/^(0|[1-9]\d{0,11})(?:\.\d{1,2})?$/);
export const couponCreateSchema = z
  .strictObject({
    code: z.string().trim().min(1).max(80),
    discountType: z.enum(["PERCENT", "FIXED"]),
    discountValue: decimalDiscount,
    maxDiscount: wholeVnd.nullable().optional(),
    usageLimit: z
      .number()
      .int()
      .min(1)
      .max(1_000_000_000)
      .nullable()
      .optional(),
    startsAt: z.iso.datetime().nullable().optional(),
    expiresAt: z.iso.datetime().nullable().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  })
  .superRefine((value, context) => {
    if (value.discountType === "PERCENT" && Number(value.discountValue) > 100)
      context.addIssue({
        code: "custom",
        path: ["discountValue"],
        message: "Percent discount cannot exceed 100.",
      });
    if (value.discountType === "FIXED" && value.discountValue.includes("."))
      context.addIssue({
        code: "custom",
        path: ["discountValue"],
        message: "Fixed discount must be whole VND.",
      });
    if (value.startsAt && value.expiresAt && value.startsAt >= value.expiresAt)
      context.addIssue({
        code: "custom",
        path: ["expiresAt"],
        message: "Expiry must be after the start date.",
      });
  });
export const couponPatchSchema = z
  .strictObject({
    code: z.string().trim().min(1).max(80).optional(),
    discountType: z.enum(["PERCENT", "FIXED"]).optional(),
    discountValue: decimalDiscount.optional(),
    maxDiscount: wholeVnd.nullable().optional(),
    usageLimit: z
      .number()
      .int()
      .min(1)
      .max(1_000_000_000)
      .nullable()
      .optional(),
    startsAt: z.iso.datetime().nullable().optional(),
    expiresAt: z.iso.datetime().nullable().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0);
export const couponIdParamsSchema = z.strictObject({ couponId: objectId });
export const enrollmentGrantSchema = z.strictObject({
  userId: objectId,
  courseId: objectId,
  durationMonths: positiveMonths,
  reason: text(1000).min(1),
});
export const enrollmentReasonSchema = z.strictObject({
  reason: text(1000).min(1),
});
export const enrollmentRestoreSchema = z.strictObject({
  reason: text(1000).min(1),
  extensionMonths: positiveMonths.optional(),
});
export const enrollmentExtendSchema = z.strictObject({
  reason: text(1000).min(1),
  durationMonths: positiveMonths,
});
export const auditListQuerySchema = z
  .strictObject({
    page,
    pageSize,
    entityType: text(80).optional(),
    entityId: z.string().trim().max(64).optional(),
    actorUserId: objectId.optional(),
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to);

export type PageQuery = z.output<typeof pageQuerySchema>;
export type CourseQuery = z.output<typeof courseListQuerySchema>;
export type SectionQuery = z.output<typeof sectionListQuerySchema>;
export type MediaQuery = z.output<typeof mediaListQuerySchema>;
export type StudentQuery = z.output<typeof studentListQuerySchema>;
export type EnrollmentQuery = z.output<typeof enrollmentListQuerySchema>;
export type AuditQuery = z.output<typeof auditListQuerySchema>;
export type CreateCourse = z.output<typeof createCourseSchema>;
export type CreateSection = z.output<typeof createSectionSchema>;
export type CreateLesson = z.output<typeof createLessonSchema>;
export type CreateExercise = z.output<typeof createExerciseSchema>;
export type CoursePatch = z.output<typeof coursePatchSchema>;
export type SectionPatch = z.output<typeof sectionPatchSchema>;
export type LessonPatch = z.output<typeof lessonPatchSchema>;
export type ExercisePatch = z.output<typeof exercisePatchSchema>;
export type CourseListQuery = z.output<typeof courseListQuerySchema>;
export type SectionListQuery = z.output<typeof sectionListQuerySchema>;
export type LessonContent = z.output<typeof lessonContent>;
