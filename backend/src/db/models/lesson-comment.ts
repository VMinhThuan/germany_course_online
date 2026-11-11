import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;

const lessonCommentSchema = new Schema(
  {
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
      immutable: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    authorRole: {
      type: String,
      enum: ["STUDENT", "ADMIN"],
      required: true,
      immutable: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "LessonComment",
      default: null,
      immutable: true,
    },
    rootId: {
      type: Schema.Types.ObjectId,
      ref: "LessonComment",
      required: true,
      immutable: true,
    },
    ancestorIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "LessonComment" }],
      default: [],
      immutable: true,
    },
    content: { type: String, required: true, trim: true, maxlength: 2_000 },
    isAnonymous: { type: Boolean, required: true, default: false },
    revision: { type: Number, required: true, default: 1, min: 1 },
    editedAt: { type: Date, default: null },
    moderationEditedAt: { type: Date, default: null },
    threadVersion: { type: Number, default: 0, min: 0 },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    deletionReason: { type: String, default: null, maxlength: 300 },
  },
  { collection: "lesson_comments", timestamps: true, strict: "throw" },
);

lessonCommentSchema.index(
  { lessonId: 1, parentId: 1, createdAt: -1, _id: -1 },
  { name: "ix_lesson_comments_lesson_parent_created" },
);
lessonCommentSchema.index(
  { lessonId: 1, createdAt: -1, _id: -1 },
  { name: "ix_lesson_comments_lesson_created" },
);
lessonCommentSchema.index(
  { authorId: 1, createdAt: -1 },
  { name: "ix_lesson_comments_author_created" },
);
lessonCommentSchema.index(
  { rootId: 1, createdAt: 1, _id: 1 },
  { name: "ix_lesson_comments_root_thread" },
);
lessonCommentSchema.index(
  { ancestorIds: 1 },
  { name: "ix_lesson_comments_ancestors" },
);
lessonCommentSchema.index(
  { lessonId: 1, deletedAt: 1, createdAt: -1 },
  { name: "ix_lesson_comments_moderation" },
);
lessonCommentSchema.index(
  { content: "text" },
  { name: "ix_lesson_comments_content_text", default_language: "none" },
);

export type LessonCommentFields = InferSchemaType<typeof lessonCommentSchema>;
export const LessonComment: Model<LessonCommentFields> =
  (models.LessonComment as Model<LessonCommentFields> | undefined) ??
  model<LessonCommentFields>(
    "LessonComment",
    lessonCommentSchema,
    "lesson_comments",
  );
