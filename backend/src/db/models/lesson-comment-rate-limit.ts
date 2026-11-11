import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;
const lessonCommentRateLimitSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true, maxlength: 32 },
    windowStart: { type: Date, required: true },
    count: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
  },
  {
    collection: "lesson_comment_rate_limits",
    timestamps: false,
    strict: "throw",
  },
);
lessonCommentRateLimitSchema.index(
  { userId: 1, action: 1, windowStart: 1 },
  { unique: true, name: "uq_lesson_comment_rate_limit_window" },
);
lessonCommentRateLimitSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: "ttl_lesson_comment_rate_limits" },
);

export type LessonCommentRateLimitFields = InferSchemaType<
  typeof lessonCommentRateLimitSchema
>;
export const LessonCommentRateLimit: Model<LessonCommentRateLimitFields> =
  (models.LessonCommentRateLimit as
    Model<LessonCommentRateLimitFields> | undefined) ??
  model<LessonCommentRateLimitFields>(
    "LessonCommentRateLimit",
    lessonCommentRateLimitSchema,
    "lesson_comment_rate_limits",
  );
