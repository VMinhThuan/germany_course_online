import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;

const exerciseProgressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    exerciseId: {
      type: Schema.Types.ObjectId,
      ref: "Exercise",
      required: true,
    },
    status: {
      type: String,
      enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"],
      required: true,
    },
    completionSource: {
      type: String,
      enum: ["MANUAL", "QUIZ", null],
      default: null,
    },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  {
    collection: "exercise_progress",
    timestamps: { createdAt: false, updatedAt: true },
    strict: "throw",
  },
);

exerciseProgressSchema.index(
  { userId: 1, exerciseId: 1 },
  { unique: true, name: "uq_exercise_progress_student_exercise" },
);
exerciseProgressSchema.index(
  { userId: 1, status: 1 },
  { name: "ix_exercise_progress_student_status" },
);

export type ExerciseProgressFields = InferSchemaType<
  typeof exerciseProgressSchema
>;
export const ExerciseProgress: Model<ExerciseProgressFields> =
  (models.ExerciseProgress as Model<ExerciseProgressFields> | undefined) ??
  model<ExerciseProgressFields>(
    "ExerciseProgress",
    exerciseProgressSchema,
    "exercise_progress",
  );
