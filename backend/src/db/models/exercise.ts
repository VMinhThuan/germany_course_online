import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;

const exerciseSchema = new Schema(
  {
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    description: { type: String, default: null, maxlength: 2000 },
    instructions: { type: String, required: true, maxlength: 20_000 },
    exerciseType: {
      type: String,
      enum: ["FILE_BASED", "QUIZ"],
      required: true,
    },
    completionMode: {
      type: String,
      enum: ["MANUAL", "QUIZ_SUBMISSION"],
      required: true,
    },
    isRequired: { type: Boolean, required: true },
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
  { collection: "exercises", timestamps: true, strict: "throw" },
);

exerciseSchema.index(
  { lessonId: 1, status: 1, deletedAt: 1, sortOrder: 1, _id: 1 },
  { name: "ix_exercises_published_lesson_order" },
);

export type ExerciseFields = InferSchemaType<typeof exerciseSchema>;
export const Exercise: Model<ExerciseFields> =
  (models.Exercise as Model<ExerciseFields> | undefined) ??
  model<ExerciseFields>("Exercise", exerciseSchema, "exercises");
