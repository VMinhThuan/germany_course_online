import mongoose, { Types } from "mongoose";
type MediaType = "IMAGE" | "VIDEO" | "AUDIO" | "PDF" | "FILE";

type Doc = Record<string, unknown>;

export function iso(value: unknown): string | null {
  return value instanceof Date ? value.toISOString() : null;
}

export function id(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return value instanceof Types.ObjectId ? value.toString() : String(value);
}

export function courseDto(value: Doc) {
  return {
    id: id(value._id),
    code: String(value.code),
    slug: String(value.slug),
    title: String(value.title),
    description: String(value.description ?? ""),
    shortDescription: String(value.shortDescription ?? ""),
    objectives: Array.isArray(value.objectives) ? value.objectives : [],
    requirements: Array.isArray(value.requirements) ? value.requirements : [],
    level: String(value.level ?? ""),
    thumbnailAssetId: id(value.thumbnailAssetId),
    bannerAssetId: id(value.bannerAssetId),
    introVideoAssetId: id(value.introVideoAssetId),
    price: decimal(value.price),
    accessDurationMonths: Number(value.accessDurationMonths),
    sortOrder: Number(value.sortOrder ?? 0),
    status: String(value.status),
    createdAt: iso(value.createdAt),
    updatedAt: iso(value.updatedAt),
    deletedAt: iso(value.deletedAt),
  };
}

export function sectionDto(value: Doc) {
  return {
    id: id(value._id),
    courseId: id(value.courseId),
    title: String(value.title),
    description: String(value.description ?? ""),
    sectionType: String(value.sectionType),
    sortOrder: Number(value.sortOrder),
    status: String(value.status),
    createdAt: iso(value.createdAt),
    updatedAt: iso(value.updatedAt),
    deletedAt: iso(value.deletedAt),
  };
}

export function lessonDto(value: Doc) {
  const lessonVideoDto = (input: unknown) => {
    if (!input || typeof input !== "object") return null;
    const video = input as Doc;
    return video.provider === "YOUTUBE" && typeof video.videoId === "string"
      ? { provider: "YOUTUBE", videoId: video.videoId }
      : null;
  };
  return {
    id: id(value._id),
    sectionId: id(value.sectionId),
    title: String(value.title),
    description: String(value.description ?? ""),
    content: safeContent(value.content),
    video: lessonVideoDto(value.video),
    solutionVideo: lessonVideoDto(value.solutionVideo),
    lessonType: String(value.lessonType),
    estimatedMinutes: value.estimatedMinutes ?? null,
    countsTowardProgress: Boolean(value.countsTowardProgress),
    sortOrder: Number(value.sortOrder),
    status: String(value.status),
    createdAt: iso(value.createdAt),
    updatedAt: iso(value.updatedAt),
    deletedAt: iso(value.deletedAt),
  };
}

export function exerciseDto(value: Doc) {
  return {
    id: id(value._id),
    lessonId: id(value.lessonId),
    title: String(value.title),
    description: value.description ?? null,
    instructions: String(value.instructions),
    exerciseType: String(value.exerciseType),
    completionMode: String(value.completionMode),
    isRequired: Boolean(value.isRequired),
    sortOrder: Number(value.sortOrder),
    status: String(value.status),
    createdAt: iso(value.createdAt),
    updatedAt: iso(value.updatedAt),
    deletedAt: iso(value.deletedAt),
  };
}

export function mediaDto(value: Doc) {
  return {
    id: id(value._id),
    originalName: String(value.originalName),
    mediaType: String(value.mediaType) as MediaType,
    mimeType: String(value.mimeType),
    fileSize: Number(value.fileSize),
    durationSeconds: value.durationSeconds ?? null,
    visibility: String(value.visibility),
    uploadedById: id(value.uploadedById),
    createdAt: iso(value.createdAt),
  };
}

export function adminMediaDto(value: Doc, usageCount = 0) {
  return {
    ...mediaDto(value),
    provider: typeof value.provider === "string" ? value.provider : "UNKNOWN",
    publicId: typeof value.storageKey === "string" ? value.storageKey : null,
    resourceType: value.resourceType ?? null,
    deliveryType: value.deliveryType ?? null,
    format: value.format ?? null,
    uploadStatus: String(value.uploadStatus),
    uploadExpiresAt: iso(value.uploadExpiresAt),
    usageCount,
  };
}

export function quizDto(value: Doc) {
  const questions = Array.isArray(value.questions) ? value.questions : [];
  return {
    id: id(value._id),
    exerciseId: id(value.exerciseId),
    title: String(value.title),
    description: value.description ?? null,
    passScorePercent: value.passScorePercent ?? null,
    showCorrectAnswers: Boolean(value.showCorrectAnswers),
    questions: questions.map((question) => {
      const q = question as Doc;
      const options = Array.isArray(q.options) ? q.options : [];
      return {
        id: id(q._id),
        questionText: String(q.questionText),
        questionType: String(q.questionType),
        explanation: q.explanation ?? null,
        points: decimal(q.points),
        sortOrder: Number(q.sortOrder),
        options: options.map((option) => {
          const o = option as Doc;
          return {
            id: id(o._id),
            optionText: String(o.optionText),
            isCorrect: Boolean(o.isCorrect),
            sortOrder: Number(o.sortOrder),
          };
        }),
      };
    }),
  };
}

function decimal(value: unknown): string {
  if (value instanceof mongoose.Types.Decimal128) return value.toString();
  return value === undefined || value === null ? "0" : String(value);
}

function safeContent(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Doc;
  if (
    record.version !== 1 ||
    !Array.isArray(record.paragraphs) ||
    record.paragraphs.length > 100 ||
    record.paragraphs.some((paragraph) => typeof paragraph !== "string")
  )
    return null;
  return { version: 1, paragraphs: [...record.paragraphs] };
}
