import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;

export const exerciseAssetRoles = [
  "QUESTION_PDF",
  "QUESTION_AUDIO",
  "ANSWER_PDF",
  "SOLUTION_VIDEO",
] as const;

const exerciseAssetSchema = new Schema(
  {
    exerciseId: {
      type: Schema.Types.ObjectId,
      ref: "Exercise",
      required: true,
    },
    assetId: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
      required: true,
    },
    assetRole: { type: String, enum: exerciseAssetRoles, required: true },
    title: { type: String, default: null, maxlength: 180 },
    sortOrder: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
  },
  { collection: "exercise_assets", versionKey: false, strict: "throw" },
);

exerciseAssetSchema.index(
  { exerciseId: 1, assetId: 1, assetRole: 1 },
  { unique: true, name: "uq_exercise_asset_role" },
);
exerciseAssetSchema.index(
  { exerciseId: 1, sortOrder: 1, _id: 1 },
  { name: "ix_exercise_assets_order" },
);

export type ExerciseAssetFields = InferSchemaType<typeof exerciseAssetSchema>;
export const ExerciseAsset: Model<ExerciseAssetFields> =
  (models.ExerciseAsset as Model<ExerciseAssetFields> | undefined) ??
  model<ExerciseAssetFields>(
    "ExerciseAsset",
    exerciseAssetSchema,
    "exercise_assets",
  );
