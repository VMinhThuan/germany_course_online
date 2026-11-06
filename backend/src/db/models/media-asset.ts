import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;

const mediaAssetSchema = new Schema(
  {
    originalName: { type: String, required: true, maxlength: 255 },
    mediaType: {
      type: String,
      enum: ["IMAGE", "VIDEO", "AUDIO", "PDF", "FILE"],
      required: true,
    },
    mimeType: { type: String, required: true, maxlength: 160 },
    fileSize: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
    provider: { type: String, required: true, select: false },
    storageKey: { type: String, required: true, select: false },
    resourceType: {
      type: String,
      enum: ["image", "video", "raw"],
      default: null,
      select: false,
    },
    deliveryType: {
      type: String,
      enum: ["upload", "private", "authenticated"],
      default: null,
      select: false,
    },
    format: { type: String, default: null, maxlength: 32 },
    providerAssetId: { type: String, default: null, select: false },
    externalMediaId: { type: String, default: null, select: false },
    durationSeconds: { type: Number, default: null, min: 0 },
    uploadedById: { type: Schema.Types.ObjectId, ref: "User", default: null },
    visibility: {
      type: String,
      enum: ["PUBLIC", "ENROLLED"],
      required: true,
      default: "ENROLLED",
    },
    uploadStatus: {
      type: String,
      enum: ["PENDING", "READY", "DELETING", "DELETED"],
      required: true,
      default: "READY",
    },
    uploadExpiresAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    referenceRevision: {
      type: Number,
      default: 0,
      min: 0,
      validate: Number.isInteger,
    },
  },
  {
    collection: "media_assets",
    timestamps: { createdAt: true, updatedAt: false },
    strict: "throw",
  },
);

mediaAssetSchema.index(
  { visibility: 1, mediaType: 1 },
  { name: "ix_media_public_metadata" },
);
mediaAssetSchema.index(
  { provider: 1, storageKey: 1 },
  { unique: true, name: "uq_media_provider_storage_key" },
);
mediaAssetSchema.index(
  { uploadStatus: 1, mediaType: 1, createdAt: -1, _id: -1 },
  { name: "ix_media_admin_library" },
);

type MediaAssetFields = InferSchemaType<typeof mediaAssetSchema>;
export const MediaAsset: Model<MediaAssetFields> =
  (models.MediaAsset as Model<MediaAssetFields> | undefined) ??
  model<MediaAssetFields>("MediaAsset", mediaAssetSchema, "media_assets");
