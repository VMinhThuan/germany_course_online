import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;

export const progressStatuses = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
] as const;

const lessonProgressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: "Lesson", required: true },
    status: { type: String, enum: progressStatuses, required: true },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    lastAccessedAt: { type: Date, default: null },
  },
  {
    collection: "lesson_progress",
    timestamps: { createdAt: false, updatedAt: true },
    strict: "throw",
  },
);

lessonProgressSchema.index(
  { userId: 1, lessonId: 1 },
  { unique: true, name: "uq_lesson_progress_student_lesson" },
);
lessonProgressSchema.index(
  { userId: 1, status: 1 },
  { name: "ix_lesson_progress_student_status" },
);

export type LessonProgressFields = InferSchemaType<typeof lessonProgressSchema>;
export const LessonProgress: Model<LessonProgressFields> =
  (models.LessonProgress as Model<LessonProgressFields> | undefined) ??
  model<LessonProgressFields>(
    "LessonProgress",
    lessonProgressSchema,
    "lesson_progress",
  );
