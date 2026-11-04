import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;

const couponRedemptionSchema = new Schema(
  {
    couponId: {
      type: Schema.Types.ObjectId,
      ref: "Coupon",
      required: true,
      immutable: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      immutable: true,
    },
    discountAmount: {
      type: Schema.Types.Decimal128,
      required: true,
      immutable: true,
    },
    status: {
      type: String,
      enum: ["RESERVED", "REDEEMED", "RELEASED"],
      required: true,
      default: "RESERVED",
    },
    reservedAt: {
      type: Date,
      required: true,
      default: Date.now,
      immutable: true,
    },
    redeemedAt: { type: Date, default: null },
    releasedAt: { type: Date, default: null },
  },
  {
    collection: "coupon_redemptions",
    timestamps: { createdAt: true, updatedAt: true },
    strict: "throw",
  },
);

couponRedemptionSchema.index(
  { orderId: 1 },
  { unique: true, name: "uq_coupon_redemptions_order" },
);
couponRedemptionSchema.index(
  { couponId: 1, status: 1, createdAt: -1 },
  { name: "ix_coupon_redemptions_coupon_state" },
);
couponRedemptionSchema.index(
  { userId: 1, createdAt: -1 },
  { name: "ix_coupon_redemptions_user_history" },
);

export type CouponRedemptionFields = InferSchemaType<
  typeof couponRedemptionSchema
>;
export const CouponRedemption: Model<CouponRedemptionFields> =
  (models.CouponRedemption as Model<CouponRedemptionFields> | undefined) ??
  model<CouponRedemptionFields>(
    "CouponRedemption",
    couponRedemptionSchema,
    "coupon_redemptions",
  );
