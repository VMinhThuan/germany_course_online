import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;

const paymentConfirmationSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      immutable: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    attemptNumber: { type: Number, required: true, min: 1, immutable: true },
    submittedAt: { type: Date, required: true, immutable: true },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      required: true,
      default: "PENDING",
    },
    reviewedById: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null, maxlength: 1000 },
  },
  { collection: "payment_confirmations", timestamps: true, strict: "throw" },
);

paymentConfirmationSchema.index(
  { orderId: 1, attemptNumber: 1 },
  { unique: true, name: "uq_payment_confirmations_order_attempt" },
);
paymentConfirmationSchema.index(
  { orderId: 1, status: 1, createdAt: -1 },
  { name: "ix_payment_confirmations_order_timeline" },
);
paymentConfirmationSchema.index(
  { orderId: 1 },
  {
    unique: true,
    name: "uq_payment_confirmations_one_pending",
    partialFilterExpression: { status: "PENDING" },
  },
);

export type PaymentConfirmationFields = InferSchemaType<
  typeof paymentConfirmationSchema
>;
export const PaymentConfirmation: Model<PaymentConfirmationFields> =
  (models.PaymentConfirmation as
    Model<PaymentConfirmationFields> | undefined) ??
  model<PaymentConfirmationFields>(
    "PaymentConfirmation",
    paymentConfirmationSchema,
    "payment_confirmations",
  );
