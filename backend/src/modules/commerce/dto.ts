import mongoose, { Types } from "mongoose";

export type PaymentInstructionsDto = {
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  qrUrl: string;
  transferInstructions: string;
};

export function amountAsVnd(value: unknown): string {
  const raw =
    value instanceof mongoose.Types.Decimal128
      ? value.toString()
      : typeof value === "string"
        ? value
        : value && typeof value === "object" && "toString" in value
          ? String(value)
          : "";
  if (!/^(0|[1-9]\d*)$/.test(raw))
    throw new Error("Stored VND amount is not an exact nonnegative integer.");
  return BigInt(raw).toString();
}

export function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function toPaymentInstructions(
  value: unknown,
): PaymentInstructionsDto | null {
  if (!value || typeof value !== "object") return null;
  const payment = value as Record<string, unknown>;
  if (
    payment.enabled !== true ||
    typeof payment.bankName !== "string" ||
    typeof payment.accountNumber !== "string" ||
    typeof payment.accountHolderName !== "string" ||
    typeof payment.qrUrl !== "string" ||
    typeof payment.transferInstructions !== "string"
  )
    return null;
  try {
    const qrUrl = new URL(payment.qrUrl);
    if (
      qrUrl.protocol !== "https:" ||
      qrUrl.username.length > 0 ||
      qrUrl.password.length > 0 ||
      !qrUrl.hostname
    )
      return null;
  } catch {
    return null;
  }
  if (
    !payment.bankName.trim() ||
    !payment.accountNumber.trim() ||
    !payment.accountHolderName.trim() ||
    !payment.transferInstructions.trim()
  )
    return null;
  return {
    bankName: payment.bankName,
    accountNumber: payment.accountNumber,
    accountHolderName: payment.accountHolderName,
    qrUrl: payment.qrUrl,
    transferInstructions: payment.transferInstructions,
  };
}

export function orderDto(value: object, admin = false) {
  const order = value as Record<string, unknown>;
  const dto = {
    id: idString(order._id),
    orderCode: String(order.orderCode),
    orderType: String(order.orderType),
    renewalPlanId: idStringOrNull(order.renewalPlanId),
    renewalPlanTitleSnapshot:
      (order.renewalPlanTitleSnapshot as string | null | undefined) ?? null,
    renewalPlanPriceSnapshot:
      order.renewalPlanPriceSnapshot == null
        ? null
        : amountAsVnd(order.renewalPlanPriceSnapshot),
    status: String(order.status),
    courseId: idString(order.courseId),
    courseTitleSnapshot: String(order.courseTitleSnapshot),
    coursePriceSnapshot: amountAsVnd(order.coursePriceSnapshot),
    baseAmount: amountAsVnd(order.baseAmount),
    discountAmount: amountAsVnd(order.discountAmount),
    discountSource: String(order.discountSource ?? "NONE"),
    totalAmount: amountAsVnd(order.totalAmount),
    couponId: idStringOrNull(order.couponId),
    durationMonthsSnapshot: Number(order.durationMonthsSnapshot),
    paymentSubmittedAt: toIso(order.paymentSubmittedAt as Date | null),
    paidAt: toIso(order.paidAt as Date | null),
    expiresAt: toIso(order.expiresAt as Date | null),
    createdAt: toIso(order.createdAt as Date)!,
    cancelledAt: toIso(order.cancelledAt as Date | null),
    cancellationReason:
      admin && typeof order.cancellationReason === "string"
        ? order.cancellationReason
        : null,
    reconciliationOutcome:
      admin && typeof order.reconciliationOutcome === "string"
        ? order.reconciliationOutcome
        : null,
  };
  return admin
    ? {
        ...dto,
        reviewedById: idStringOrNull(order.reviewedById),
        reviewedAt: toIso(order.reviewedAt as Date | null),
        reviewNote: (order.reviewNote as string | null | undefined) ?? null,
      }
    : dto;
}

export function enrollmentDto(
  enrollment: Record<string, unknown>,
  courseTitle: string,
) {
  return {
    id: idString(enrollment._id),
    courseId: idString(enrollment.courseId),
    courseTitle,
    status: String(enrollment.status),
    activatedAt: toIso(enrollment.activatedAt as Date | null),
    expiresAt: toIso(enrollment.expiresAt as Date)!,
    progressPercent: 0,
  };
}

function idString(value: unknown): string {
  return value instanceof Types.ObjectId ? value.toString() : String(value);
}

function idStringOrNull(value: unknown): string | null {
  return value === null || value === undefined ? null : idString(value);
}

export function addUtcCalendarMonths(anchor: Date, months: number): Date {
  const targetMonthIndex =
    anchor.getUTCFullYear() * 12 + anchor.getUTCMonth() + months;
  const targetYear = Math.floor(targetMonthIndex / 12);
  const targetMonth = targetMonthIndex % 12;
  const finalDay = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();
  const day = Math.min(anchor.getUTCDate(), finalDay);
  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      day,
      anchor.getUTCHours(),
      anchor.getUTCMinutes(),
      anchor.getUTCSeconds(),
      anchor.getUTCMilliseconds(),
    ),
  );
}
