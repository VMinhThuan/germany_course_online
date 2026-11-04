import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
    },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String, default: null },
    avatarAssetId: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
      default: null,
    },
    role: {
      type: String,
      enum: ["STUDENT", "ADMIN"],
      required: true,
      default: "STUDENT",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "BLOCKED"],
      required: true,
      default: "ACTIVE",
    },
    emailVerifiedAt: { type: Date, default: null },
  },
  { collection: "users", timestamps: true, strict: "throw" },
);

userSchema.index(
  { email: 1 },
  { unique: true, name: "uq_users_email_normalized" },
);
userSchema.index(
  { role: 1, status: 1, createdAt: -1, _id: -1 },
  { name: "ix_users_admin_student_list" },
);

type UserFields = InferSchemaType<typeof userSchema>;
export const User: Model<UserFields> =
  (models.User as Model<UserFields> | undefined) ??
  model<UserFields>("User", userSchema, "users");
