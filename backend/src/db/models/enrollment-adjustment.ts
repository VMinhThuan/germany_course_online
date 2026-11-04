import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;

const enrollmentAdjustmentSchema = new Schema(
  {
    enrollmentId: {
      type: Schema.Types.ObjectId,
      ref: "Enrollment",
      required: true,
      immutable: true,
    },
    adjustmentType: {
      type: String,
      enum: ["GRANT", "RENEW", "REVOKE", "RESTORE"],
      required: true,
      immutable: true,
    },
    previousExpiresAt: { type: Date, default: null, immutable: true },
    newExpiresAt: { type: Date, default: null, immutable: true },
    durationMonths: { type: Number, default: null, min: 1, immutable: true },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      immutable: true,
    },
    performedById: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      immutable: true,
    },
    reason: { type: String, default: null, maxlength: 1000, immutable: true },
    idempotencyKey: {
      type: String,
      default: undefined,
      immutable: true,
      select: false,
    },
    requestFingerprint: {
      type: String,
      default: undefined,
      immutable: true,
      select: false,
    },
  },
  {
    collection: "enrollment_adjustments",
    timestamps: { createdAt: true, updatedAt: false },
    strict: "throw",
  },
);

enrollmentAdjustmentSchema.index(
  { enrollmentId: 1, createdAt: -1 },
  { name: "ix_enrollment_adjustments_timeline" },
);
enrollmentAdjustmentSchema.index(
  { performedById: 1, idempotencyKey: 1 },
  {
    unique: true,
    name: "uq_enrollment_adjustments_admin_idempotency",
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
  },
);
enrollmentAdjustmentSchema.index(
  { orderId: 1, adjustmentType: 1 },
  {
    unique: true,
    name: "uq_enrollment_adjustments_order_type",
    partialFilterExpression: { orderId: { $type: "objectId" } },
  },
);

export type EnrollmentAdjustmentFields = InferSchemaType<
  typeof enrollmentAdjustmentSchema
>;
export const EnrollmentAdjustment: Model<EnrollmentAdjustmentFields> =
  (models.EnrollmentAdjustment as
    Model<EnrollmentAdjustmentFields> | undefined) ??
  model<EnrollmentAdjustmentFields>(
    "EnrollmentAdjustment",
    enrollmentAdjustmentSchema,
    "enrollment_adjustments",
  );
