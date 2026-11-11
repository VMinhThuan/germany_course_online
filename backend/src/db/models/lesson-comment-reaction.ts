import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;
const lessonCommentReactionSchema = new Schema(
  {
    commentId: {
      type: Schema.Types.ObjectId,
      ref: "LessonComment",
      required: true,
      immutable: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    reactionType: {
      type: String,
      enum: ["LIKE", "LOVE", "HAHA", "WOW", "CLAP"],
      required: true,
    },
  },
  { collection: "lesson_comment_reactions", timestamps: true, strict: "throw" },
);
lessonCommentReactionSchema.index(
  { commentId: 1, userId: 1 },
  { unique: true, name: "uq_lesson_comment_reactions_user" },
);
lessonCommentReactionSchema.index(
  { commentId: 1, reactionType: 1 },
  { name: "ix_lesson_comment_reactions_comment_type" },
);
lessonCommentReactionSchema.index(
  { userId: 1, createdAt: -1 },
  { name: "ix_lesson_comment_reactions_user_created" },
);

export type LessonCommentReactionFields = InferSchemaType<
  typeof lessonCommentReactionSchema
>;
export const LessonCommentReaction: Model<LessonCommentReactionFields> =
  (models.LessonCommentReaction as
    Model<LessonCommentReactionFields> | undefined) ??
  model<LessonCommentReactionFields>(
    "LessonCommentReaction",
    lessonCommentReactionSchema,
    "lesson_comment_reactions",
  );
