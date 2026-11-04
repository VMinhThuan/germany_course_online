import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;

const loginEventSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    outcome: { type: String, enum: ["SUCCESS", "FAILURE"], required: true },
    reasonCode: { type: String, required: true, maxlength: 64 },
    ipAddress: { type: String, default: null, maxlength: 64 },
    userAgent: { type: String, default: null, maxlength: 512 },
  },
  {
    collection: "login_events",
    timestamps: { createdAt: true, updatedAt: false },
    strict: "throw",
  },
);

loginEventSchema.index(
  { userId: 1, createdAt: -1 },
  { name: "ix_login_events_user_created" },
);
loginEventSchema.index(
  { ipAddress: 1, createdAt: -1 },
  { name: "ix_login_events_ip_created" },
);

type LoginEventFields = InferSchemaType<typeof loginEventSchema>;
export const LoginEvent: Model<LoginEventFields> =
  (models.LoginEvent as Model<LoginEventFields> | undefined) ??
  model<LoginEventFields>("LoginEvent", loginEventSchema, "login_events");
