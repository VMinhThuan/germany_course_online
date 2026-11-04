import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;

const lessonNoteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: "Lesson", required: true },
    content: { type: String, required: true, maxlength: 10_000 },
  },
  { collection: "lesson_notes", timestamps: true, strict: "throw" },
);

lessonNoteSchema.index(
  { userId: 1, lessonId: 1 },
  { unique: true, name: "uq_lesson_notes_student_lesson" },
);

export type LessonNoteFields = InferSchemaType<typeof lessonNoteSchema>;
export const LessonNote: Model<LessonNoteFields> =
  (models.LessonNote as Model<LessonNoteFields> | undefined) ??
  model<LessonNoteFields>("LessonNote", lessonNoteSchema, "lesson_notes");
