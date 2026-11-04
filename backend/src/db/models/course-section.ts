import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;

const courseSectionSchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    description: { type: String, default: "" },
    sectionType: {
      type: String,
      enum: ["CHAPTER", "EXAM_PREP"],
      required: true,
    },
    sortOrder: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "HIDDEN"],
      required: true,
    },
    deletedAt: { type: Date, default: null },
  },
  { collection: "course_sections", timestamps: true, strict: "throw" },
);

courseSectionSchema.index(
  { courseId: 1, status: 1, deletedAt: 1, sortOrder: 1, _id: 1 },
  { name: "ix_sections_public_outline" },
);

type CourseSectionFields = InferSchemaType<typeof courseSectionSchema>;
export const CourseSection: Model<CourseSectionFields> =
  (models.CourseSection as Model<CourseSectionFields> | undefined) ??
  model<CourseSectionFields>(
    "CourseSection",
    courseSectionSchema,
    "course_sections",
  );
