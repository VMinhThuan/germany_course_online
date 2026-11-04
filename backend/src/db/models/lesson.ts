import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;

const lessonSchema = new Schema(
  {
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: "CourseSection",
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    description: { type: String, default: "" },
    content: { type: Schema.Types.Mixed, default: null, select: false },
    lessonType: { type: String, enum: ["LECTURE", "PRACTICE"], required: true },
    estimatedMinutes: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator: (value: number | null) =>
          value === null || Number.isInteger(value),
      },
    },
    countsTowardProgress: { type: Boolean, default: true },
    sortOrder: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "HIDDEN"],
      required: true,
    },
    deletedAt: { type: Date, default: null },
    mediaAssociationRevision: {
      type: Number,
      default: 0,
      min: 0,
      validate: Number.isInteger,
    },
  },
  { collection: "lessons", timestamps: true, strict: "throw" },
);

lessonSchema.index(
  { sectionId: 1, status: 1, deletedAt: 1, sortOrder: 1, _id: 1 },
  { name: "ix_lessons_public_outline" },
);

type LessonFields = InferSchemaType<typeof lessonSchema>;
export const Lesson: Model<LessonFields> =
  (models.Lesson as Model<LessonFields> | undefined) ??
  model<LessonFields>("Lesson", lessonSchema, "lessons");
