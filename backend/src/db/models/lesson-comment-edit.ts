import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;
const lessonCommentEditSchema = new Schema(
  {
    commentId: {
      type: Schema.Types.ObjectId,
      ref: "LessonComment",
      required: true,
      immutable: true,
    },
    previousContent: { type: String, required: true, immutable: true },
    newContent: { type: String, required: true, immutable: true },
    previousRevision: { type: Number, required: true, immutable: true },
    newRevision: { type: Number, required: true, immutable: true },
    editedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    editedByRole: {
      type: String,
      enum: ["STUDENT", "ADMIN"],
      required: true,
      immutable: true,
    },
    isPublic: { type: Boolean, required: true, immutable: true },
    editedAt: { type: Date, required: true, immutable: true },
    reason: { type: String, default: null, maxlength: 300, immutable: true },
  },
  {
    collection: "lesson_comment_edits",
    timestamps: { createdAt: true, updatedAt: false },
    strict: "throw",
  },
);
lessonCommentEditSchema.index(
  { commentId: 1, newRevision: 1 },
  { unique: true, name: "uq_lesson_comment_edits_revision" },
);
lessonCommentEditSchema.index(
  { commentId: 1, editedAt: 1, _id: 1 },
  { name: "ix_lesson_comment_edits_timeline" },
);

export type LessonCommentEditFields = InferSchemaType<
  typeof lessonCommentEditSchema
>;
export const LessonCommentEdit: Model<LessonCommentEditFields> =
  (models.LessonCommentEdit as Model<LessonCommentEditFields> | undefined) ??
  model<LessonCommentEditFields>(
    "LessonCommentEdit",
    lessonCommentEditSchema,
    "lesson_comment_edits",
  );
