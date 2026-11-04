import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;

const userSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    refreshTokenHash: { type: String, required: true, select: false },
    previousRefreshTokenHashes: {
      type: [String],
      default: [],
      select: false,
      validate: {
        validator: (values: string[]) => values.length <= 5,
        message: "Only five previous refresh-token hashes may be retained.",
      },
    },
    deviceId: { type: String, default: null, maxlength: 160 },
    deviceName: { type: String, default: null, maxlength: 160 },
    userAgent: { type: String, default: null, maxlength: 512, select: false },
    ipAddress: { type: String, default: null, maxlength: 64, select: false },
    status: {
      type: String,
      enum: ["ACTIVE", "REVOKED", "EXPIRED"],
      required: true,
      default: "ACTIVE",
    },
    expiresAt: { type: Date, required: true },
    lastActiveAt: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null },
    revokeReason: { type: String, default: null },
    roleAtIssue: { type: String, enum: ["STUDENT", "ADMIN"], required: true },
  },
  { collection: "user_sessions", timestamps: true, strict: "throw" },
);

userSessionSchema.index(
  { userId: 1, status: 1, expiresAt: -1 },
  { name: "ix_sessions_owner_status_expiry" },
);
userSessionSchema.index(
  { refreshTokenHash: 1 },
  { unique: true, name: "uq_sessions_refresh_hash" },
);
userSessionSchema.index(
  { userId: 1 },
  {
    unique: true,
    name: "uq_active_student_session",
    partialFilterExpression: { status: "ACTIVE", roleAtIssue: "STUDENT" },
  },
);

type UserSessionFields = InferSchemaType<typeof userSessionSchema>;
export const UserSession: Model<UserSessionFields> =
  (models.UserSession as Model<UserSessionFields> | undefined) ??
  model<UserSessionFields>("UserSession", userSessionSchema, "user_sessions");
