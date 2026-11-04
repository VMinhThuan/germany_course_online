import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;

const couponSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 80,
    },
    discountType: { type: String, enum: ["PERCENT", "FIXED"], required: true },
    discountValue: { type: Schema.Types.Decimal128, required: true },
    maxDiscount: { type: Schema.Types.Decimal128, default: null },
    usageLimit: {
      type: Number,
      default: null,
      validate: {
        validator: (value: number | null) =>
          value === null || (Number.isInteger(value) && value >= 1),
        message: "Usage limit must be a positive integer or null.",
      },
    },
    startsAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
    reservedCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: Number.isInteger,
    },
    redemptionCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: Number.isInteger,
    },
  },
  {
    collection: "coupons",
    timestamps: true,
    strict: "throw",
  },
);

couponSchema.index(
  { code: 1 },
  { unique: true, name: "uq_coupons_normalized_code" },
);
couponSchema.index(
  { status: 1, createdAt: -1, _id: -1 },
  { name: "ix_coupons_status_created" },
);

export type CouponFields = InferSchemaType<typeof couponSchema>;
export const Coupon: Model<CouponFields> =
  (models.Coupon as Model<CouponFields> | undefined) ??
  model<CouponFields>("Coupon", couponSchema, "coupons");
