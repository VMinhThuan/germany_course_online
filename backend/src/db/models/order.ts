import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;

const vndDecimal = {
  type: Schema.Types.Decimal128,
  required: true,
  validate: {
    validator: (value: { toString(): string }) =>
      /^(0|[1-9]\d*)$/.test(value.toString()),
    message: "Order VND amounts must be nonnegative integers.",
  },
};

const orderSchema = new Schema(
  {
    orderCode: { type: String, required: true, immutable: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      immutable: true,
    },
    orderType: {
      type: String,
      enum: ["PURCHASE", "RENEWAL"],
      required: true,
      immutable: true,
    },
    renewalPlanId: {
      type: Schema.Types.ObjectId,
      ref: "RenewalPlan",
      default: null,
      immutable: true,
    },
    renewalPlanTitleSnapshot: { type: String, default: null, immutable: true },
    renewalPlanPriceSnapshot: {
      type: Schema.Types.Decimal128,
      default: null,
      immutable: true,
      validate: {
        validator: (value: { toString(): string } | null) =>
          value === null || /^(0|[1-9]\d*)$/.test(value.toString()),
        message: "Renewal plan VND price must be a nonnegative integer.",
      },
    },
    durationMonthsSnapshot: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isInteger,
      immutable: true,
    },
    courseTitleSnapshot: { type: String, required: true, immutable: true },
    coursePriceSnapshot: { ...vndDecimal, immutable: true },
    baseAmount: { ...vndDecimal, immutable: true },
    discountAmount: { ...vndDecimal, immutable: true },
    discountSource: {
      type: String,
      enum: ["NONE", "COUPON", "AUTOMATIC_5_PERCENT"],
      required: true,
      default: "NONE",
      immutable: true,
    },
    totalAmount: { ...vndDecimal, immutable: true },
    couponId: {
      type: Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
      immutable: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "CANCELLED", "EXPIRED"],
      required: true,
      default: "PENDING",
    },
    paymentSubmittedAt: { type: Date, default: null },
    reviewedById: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: null, maxlength: 1000 },
    idempotencyKey: { type: String, default: undefined, select: false },
    requestFingerprint: { type: String, default: undefined, select: false },
    paidAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelledById: { type: Schema.Types.ObjectId, ref: "User", default: null },
    cancellationActorType: {
      type: String,
      enum: ["STUDENT", "ADMIN", null],
      default: null,
    },
    cancellationReason: { type: String, default: null, maxlength: 1000 },
    reconciliationOutcome: {
      type: String,
      enum: ["NO_FUNDS_RECEIVED", "REFUND_CONFIRMED_EXTERNALLY", null],
      default: null,
    },
  },
  {
    collection: "orders",
    timestamps: { createdAt: true, updatedAt: false },
    strict: "throw",
  },
);

orderSchema.index({ orderCode: 1 }, { unique: true, name: "uq_orders_code" });
orderSchema.index(
  { userId: 1, createdAt: -1 },
  { name: "ix_orders_student_history" },
);
orderSchema.index(
  { userId: 1, courseId: 1 },
  {
    unique: true,
    name: "uq_orders_one_pending_renewal",
    partialFilterExpression: { status: "PENDING", orderType: "RENEWAL" },
  },
);
orderSchema.index(
  { status: 1, cancelledAt: -1, cancelledById: 1 },
  { name: "ix_orders_cancellation_history" },
);
orderSchema.index(
  { status: 1, paymentSubmittedAt: 1, createdAt: 1 },
  { name: "ix_orders_admin_review_queue" },
);
orderSchema.index(
  { courseId: 1, userId: 1, createdAt: -1 },
  { name: "ix_orders_course_student_history" },
);
orderSchema.index(
  { userId: 1, idempotencyKey: 1 },
  {
    unique: true,
    name: "uq_orders_idempotency_key",
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
  },
);
orderSchema.index(
  { userId: 1, courseId: 1 },
  {
    unique: true,
    name: "uq_orders_one_pending_purchase",
    partialFilterExpression: { status: "PENDING", orderType: "PURCHASE" },
  },
);

export type OrderFields = InferSchemaType<typeof orderSchema>;
export const Order: Model<OrderFields> =
  (models.Order as Model<OrderFields> | undefined) ??
  model<OrderFields>("Order", orderSchema, "orders");
