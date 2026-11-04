import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;

const courseSchema = new Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, required: true },
    shortDescription: { type: String, default: "" },
    objectives: { type: [String], default: [] },
    requirements: { type: [String], default: [] },
    level: { type: String, default: "" },
    thumbnailAssetId: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
      default: null,
    },
    bannerAssetId: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
      default: null,
    },
    introVideoAssetId: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
      default: null,
    },
    price: {
      type: Schema.Types.Decimal128,
      required: true,
      validate: {
        validator: (value: { toString(): string }) =>
          /^(0|[1-9]\d*)$/.test(value.toString()),
        message: "VND price must be a nonnegative integer.",
      },
    },
    accessDurationMonths: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isInteger,
    },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      required: true,
    },
    sortOrder: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    deletedAt: { type: Date, default: null },
  },
  { collection: "courses", timestamps: true, strict: "throw" },
);

courseSchema.index({ slug: 1 }, { unique: true, name: "uq_courses_slug" });
courseSchema.index({ code: 1 }, { unique: true, name: "uq_courses_code" });
courseSchema.index(
  { status: 1, deletedAt: 1, sortOrder: 1, _id: 1 },
  { name: "ix_courses_public_catalog" },
);

type CourseFields = InferSchemaType<typeof courseSchema>;
export const Course: Model<CourseFields> =
  (models.Course as Model<CourseFields> | undefined) ??
  model<CourseFields>("Course", courseSchema, "courses");
