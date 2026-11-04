import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;

const emailLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    recipientType: { type: String, enum: ["ADMIN", "STUDENT"], required: true },
    recipientEmail: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
    templateType: {
      type: String,
      enum: [
        "TRANSFER_SUBMITTED_ADMIN",
        "ORDER_APPROVED_STUDENT",
        "RENEWAL_APPROVED_STUDENT",
        "ORDER_CANCELLED_STUDENT",
        "ENROLLMENT_GRANTED_STUDENT",
        "ENROLLMENT_REVOKED_STUDENT",
        "ENROLLMENT_RESTORED_STUDENT",
        "ENROLLMENT_EXTENDED_STUDENT",
      ],
      required: true,
    },
    subject: { type: String, required: true, maxlength: 200 },
    templateData: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "SENT", "FAILED"],
      required: true,
      default: "PENDING",
    },
    dedupeKey: { type: String, required: true, immutable: true },
    attempts: { type: Number, required: true, default: 0, min: 0 },
    providerMessageId: { type: String, default: null },
    sentAt: { type: Date, default: null },
    errorMessage: { type: String, default: null, maxlength: 300 },
    availableAt: { type: Date, required: true, default: Date.now },
    leaseExpiresAt: { type: Date, default: null },
    leaseToken: { type: String, default: null, select: false },
    lastErrorCode: { type: String, default: null, maxlength: 80 },
  },
  {
    collection: "email_logs",
    timestamps: { createdAt: true, updatedAt: false },
    strict: "throw",
  },
);

emailLogSchema.index(
  { dedupeKey: 1 },
  { unique: true, name: "uq_email_logs_dedupe_key" },
);
emailLogSchema.index(
  { status: 1, availableAt: 1, leaseExpiresAt: 1 },
  { name: "ix_email_logs_worker_claim" },
);
emailLogSchema.index(
  { userId: 1, createdAt: -1 },
  { name: "ix_email_logs_user_history" },
);

export type EmailLogFields = InferSchemaType<typeof emailLogSchema>;
export const EmailLog: Model<EmailLogFields> =
  (models.EmailLog as Model<EmailLogFields> | undefined) ??
  model<EmailLogFields>("EmailLog", emailLogSchema, "email_logs");
