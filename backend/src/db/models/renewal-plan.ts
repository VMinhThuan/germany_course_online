import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;

const renewalPlanSchema = new Schema(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      immutable: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    durationMonths: {
      type: Number,
      required: true,
      min: 1,
      max: 120,
      validate: Number.isInteger,
    },
    price: {
      type: Schema.Types.Decimal128,
      required: true,
      validate: {
        validator: (value: { toString(): string }) =>
          /^(0|[1-9]\d*)$/.test(value.toString()),
        message: "Renewal price must be a nonnegative whole VND amount.",
      },
    },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
    sortOrder: { type: Number, default: 0, min: 0, validate: Number.isInteger },
  },
  {
    collection: "renewal_plans",
    timestamps: true,
    strict: "throw",
  },
);

renewalPlanSchema.index(
  { courseId: 1, status: 1, sortOrder: 1, _id: 1 },
  { name: "ix_renewal_plans_course_status_order" },
);

export type RenewalPlanFields = InferSchemaType<typeof renewalPlanSchema>;
export const RenewalPlan: Model<RenewalPlanFields> =
  (models.RenewalPlan as Model<RenewalPlanFields> | undefined) ??
  model<RenewalPlanFields>("RenewalPlan", renewalPlanSchema, "renewal_plans");
