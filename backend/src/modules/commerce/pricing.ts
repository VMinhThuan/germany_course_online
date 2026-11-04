import { AppError } from "../../shared/errors.js";

export type DiscountSource = "NONE" | "COUPON" | "AUTOMATIC_5_PERCENT";
export type CouponPricingInput = {
  discountType: "PERCENT" | "FIXED";
  discountValue: string;
  maxDiscount?: string | null;
};

export type DiscountSelection = {
  couponDiscount: string;
  automaticDiscount: string;
  discountAmount: string;
  discountSource: DiscountSource;
  totalAmount: string;
};

export function normalizeCouponCode(value: string): string {
  return value.trim().toUpperCase();
}

export function calculateCouponDiscount(
  baseAmount: string,
  coupon: CouponPricingInput,
): string {
  const base = parseWholeVnd(baseAmount);
  let discount: bigint;
  if (coupon.discountType === "FIXED") {
    discount = parseWholeVnd(coupon.discountValue);
  } else {
    const rate = parseDecimal(coupon.discountValue);
    if (rate.scale > 2 || rate.coefficient > 100n * 10n ** BigInt(rate.scale))
      throw new AppError(
        409,
        "COUPON_CONFIGURATION_INVALID",
        "Coupon percentage is invalid.",
      );
    const denominator = 100n * 10n ** BigInt(rate.scale);
    const numerator = base * rate.coefficient;
    // PROVISIONAL policy: half-up to the nearest whole VND.
    discount = (numerator * 2n + denominator) / (2n * denominator);
  }
  if (coupon.maxDiscount !== undefined && coupon.maxDiscount !== null)
    discount =
      discount < parseWholeVnd(coupon.maxDiscount)
        ? discount
        : parseWholeVnd(coupon.maxDiscount);
  if (discount > base) discount = base;
  return discount.toString();
}

export function calculateAutomaticFivePercent(baseAmount: string): string {
  const base = parseWholeVnd(baseAmount);
  return ((base * 5n + 50n) / 100n).toString();
}

export function chooseDiscount(
  baseAmount: string,
  couponDiscount: string,
  automaticDiscount: string,
): DiscountSelection {
  const base = parseWholeVnd(baseAmount);
  const coupon = parseWholeVnd(couponDiscount);
  const automatic = parseWholeVnd(automaticDiscount);
  // The automatic discount wins ties, so an equal coupon is not reserved.
  const discountSource: DiscountSource =
    automatic > 0n && automatic >= coupon
      ? "AUTOMATIC_5_PERCENT"
      : coupon > 0n
        ? "COUPON"
        : "NONE";
  const discountAmount =
    discountSource === "AUTOMATIC_5_PERCENT"
      ? automatic
      : discountSource === "COUPON"
        ? coupon
        : 0n;
  return {
    couponDiscount: coupon.toString(),
    automaticDiscount: automatic.toString(),
    discountAmount: discountAmount.toString(),
    discountSource,
    totalAmount: (base - discountAmount).toString(),
  };
}

export function parseWholeVnd(value: string): bigint {
  if (!/^(0|[1-9]\d*)$/.test(value))
    throw new AppError(
      409,
      "MONEY_CONFIGURATION_INVALID",
      "Stored VND amount is invalid.",
    );
  return BigInt(value);
}

function parseDecimal(value: string): { coefficient: bigint; scale: number } {
  const match = /^(0|[1-9]\d*)(?:\.(\d+))?$/.exec(value);
  if (!match)
    throw new AppError(
      409,
      "COUPON_CONFIGURATION_INVALID",
      "Coupon discount is invalid.",
    );
  const fraction = match[2] ?? "";
  const coefficient = BigInt(`${match[1]}${fraction}`);
  return { coefficient, scale: fraction.length };
}
