import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;

const passwordResetTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
  },
  {
    collection: "password_reset_tokens",
    timestamps: { createdAt: true, updatedAt: false },
    strict: "throw",
  },
);

passwordResetTokenSchema.index(
  { tokenHash: 1 },
  { unique: true, name: "uq_password_reset_token_hash" },
);
passwordResetTokenSchema.index(
  { userId: 1, expiresAt: 1 },
  { name: "ix_password_reset_owner_expiry" },
);

type PasswordResetTokenFields = InferSchemaType<
  typeof passwordResetTokenSchema
>;
export const PasswordResetToken: Model<PasswordResetTokenFields> =
  (models.PasswordResetToken as Model<PasswordResetTokenFields> | undefined) ??
  model<PasswordResetTokenFields>(
    "PasswordResetToken",
    passwordResetTokenSchema,
    "password_reset_tokens",
  );
