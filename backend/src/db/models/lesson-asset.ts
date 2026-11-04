import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;

export const lessonAssetRoles = [
  "LECTURE_VIDEO",
  "LECTURE_PDF",
  "ATTACHMENT",
] as const;

const lessonAssetSchema = new Schema(
  {
    lessonId: { type: Schema.Types.ObjectId, ref: "Lesson", required: true },
    assetId: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
      required: true,
    },
    assetRole: { type: String, enum: lessonAssetRoles, required: true },
    title: { type: String, default: null, maxlength: 180 },
    sortOrder: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
  },
  { collection: "lesson_assets", versionKey: false, strict: "throw" },
);

lessonAssetSchema.index(
  { lessonId: 1, assetId: 1, assetRole: 1 },
  { unique: true, name: "uq_lesson_asset_role" },
);
lessonAssetSchema.index(
  { lessonId: 1, sortOrder: 1, _id: 1 },
  { name: "ix_lesson_assets_order" },
);

export type LessonAssetFields = InferSchemaType<typeof lessonAssetSchema>;
export const LessonAsset: Model<LessonAssetFields> =
  (models.LessonAsset as Model<LessonAssetFields> | undefined) ??
  model<LessonAssetFields>("LessonAsset", lessonAssetSchema, "lesson_assets");
