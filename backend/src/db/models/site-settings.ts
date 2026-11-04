import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;

const siteSettingsSchema = new Schema(
  {
    _id: { type: String, default: "site" },
    siteName: { type: String, required: true, maxlength: 160 },
    logoAssetId: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
      default: null,
    },
    heroTitle: { type: String, default: "" },
    heroDescription: { type: String, default: "" },
    heroAssetId: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
      default: null,
    },
    contactEmail: { type: String, default: null, lowercase: true, trim: true },
    contactPhone: { type: String, default: null },
    facebookUrl: { type: String, default: null },
    zaloUrl: { type: String, default: null },
    footerDescription: { type: String, default: "" },
    payment: { type: Schema.Types.Mixed, default: undefined, select: false },
    updatedAt: { type: Date, required: true, default: Date.now },
  },
  {
    collection: "site_settings",
    timestamps: false,
    strict: "throw",
    versionKey: false,
  },
);

type SiteSettingsFields = InferSchemaType<typeof siteSettingsSchema>;
export const SiteSettings: Model<SiteSettingsFields> =
  (models.SiteSettings as Model<SiteSettingsFields> | undefined) ??
  model<SiteSettingsFields>(
    "SiteSettings",
    siteSettingsSchema,
    "site_settings",
  );
