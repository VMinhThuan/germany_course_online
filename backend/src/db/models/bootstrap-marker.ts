import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;

const bootstrapMarkerSchema = new Schema(
  {
    _id: { type: String, enum: ["initial-admin"], required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    operator: { type: String, required: true, maxlength: 120 },
    approvalTicket: { type: String, required: true, maxlength: 128 },
    createdAt: { type: Date, required: true },
  },
  {
    collection: "bootstrap_markers",
    timestamps: false,
    strict: "throw",
    versionKey: false,
  },
);

type BootstrapMarkerFields = InferSchemaType<typeof bootstrapMarkerSchema>;
export const BootstrapMarker: Model<BootstrapMarkerFields> =
  (models.BootstrapMarker as Model<BootstrapMarkerFields> | undefined) ??
  model<BootstrapMarkerFields>(
    "BootstrapMarker",
    bootstrapMarkerSchema,
    "bootstrap_markers",
  );
