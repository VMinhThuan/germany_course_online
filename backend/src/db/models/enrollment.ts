import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;

const enrollmentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    sourceOrderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    activatedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    status: { type: String, enum: ["ACTIVE", "REVOKED"], required: true },
  },
  { collection: "enrollments", timestamps: true, strict: "throw" },
);

enrollmentSchema.index(
  { userId: 1, courseId: 1 },
  { unique: true, name: "uq_enrollments_user_course" },
);
enrollmentSchema.index(
  { userId: 1, status: 1, expiresAt: 1 },
  { name: "ix_enrollments_student_access" },
);
enrollmentSchema.index(
  { courseId: 1, status: 1, expiresAt: 1 },
  { name: "ix_enrollments_course_expiry" },
);
enrollmentSchema.index(
  { status: 1, activatedAt: -1, _id: -1 },
  { name: "ix_enrollments_admin_recent" },
);

export type EnrollmentFields = InferSchemaType<typeof enrollmentSchema>;
export const Enrollment: Model<EnrollmentFields> =
  (models.Enrollment as Model<EnrollmentFields> | undefined) ??
  model<EnrollmentFields>("Enrollment", enrollmentSchema, "enrollments");
