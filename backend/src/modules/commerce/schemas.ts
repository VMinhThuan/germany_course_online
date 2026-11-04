import { z } from "zod";

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/);
export const courseIdParamsSchema = z.object({ courseId: objectId }).strict();

export const checkoutQuoteQuerySchema = z
  .object({
    courseId: objectId,
    orderType: z.enum(["PURCHASE", "RENEWAL"]),
    renewalPlanId: objectId.optional(),
    couponCode: z.string().trim().max(80).optional(),
  })
  .strict();

export const orderCreateSchema = z
  .object({
    courseId: objectId,
    orderType: z.enum(["PURCHASE", "RENEWAL"]),
    renewalPlanId: objectId.nullable().optional(),
    couponCode: z.string().trim().max(80).nullable().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.orderType === "RENEWAL" && !value.renewalPlanId)
      context.addIssue({
        code: "custom",
        path: ["renewalPlanId"],
        message: "A renewal plan is required.",
      });
    if (value.orderType === "PURCHASE" && value.renewalPlanId)
      context.addIssue({
        code: "custom",
        path: ["renewalPlanId"],
        message: "Purchase orders cannot specify a renewal plan.",
      });
  });

export const couponValidateSchema = z
  .strictObject({
    courseId: objectId,
    orderType: z.enum(["PURCHASE", "RENEWAL"]),
    renewalPlanId: objectId.optional(),
    code: z.string().trim().min(1).max(80),
  })
  .superRefine((value, context) => {
    if (value.orderType === "RENEWAL" && !value.renewalPlanId)
      context.addIssue({
        code: "custom",
        path: ["renewalPlanId"],
        message: "A renewal plan is required.",
      });
    if (value.orderType === "PURCHASE" && value.renewalPlanId)
      context.addIssue({
        code: "custom",
        path: ["renewalPlanId"],
        message: "Purchase validation cannot specify a renewal plan.",
      });
  });

export const pageQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    status: z
      .enum(["PENDING", "PAID", "FAILED", "CANCELLED", "EXPIRED"])
      .optional(),
  })
  .strict();

const queryBoolean = z.preprocess(
  (value) => (value === undefined ? undefined : value),
  z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
);

export const adminOrderQuerySchema = pageQuerySchema
  .extend({ paymentSubmitted: queryBoolean })
  .strict();

export const orderIdParamsSchema = z.object({ orderId: objectId }).strict();

export const orderApprovalSchema = z
  .object({ reviewNote: z.string().trim().max(1000).optional() })
  .strict();

export const adminOrderCancelSchema = z.strictObject({
  reason: z.string().trim().min(1).max(1000),
  reconciliationOutcome: z.enum([
    "NO_FUNDS_RECEIVED",
    "REFUND_CONFIRMED_EXTERNALLY",
  ]),
});

export const bankTransferPatchSchema = z
  .object({
    enabled: z.boolean(),
    bankName: z.string().trim().min(1).max(120).optional(),
    accountNumber: z.string().trim().min(4).max(64).optional(),
    accountHolderName: z.string().trim().min(1).max(160).optional(),
    qrUrl: z
      .string()
      .url()
      .refine(
        (value) => {
          if (!URL.canParse(value)) return false;
          const url = new URL(value);
          return (
            url.protocol === "https:" &&
            url.hostname.length > 0 &&
            url.username.length === 0 &&
            url.password.length === 0
          );
        },
        {
          message: "The hosted QR reference must use HTTPS.",
        },
      )
      .nullable()
      .optional(),
    transferInstructions: z.string().trim().min(1).max(1000).optional(),
  })
  .strict();

export const siteSettingsPatchSchema = z
  .object({
    siteName: z.string().trim().min(1).max(160).optional(),
    logoAssetId: objectId.nullable().optional(),
    heroTitle: z.string().max(240).optional(),
    heroDescription: z.string().max(2000).optional(),
    heroAssetId: objectId.nullable().optional(),
    contactEmail: z.string().email().nullable().optional(),
    contactPhone: z.string().max(80).nullable().optional(),
    facebookUrl: z.string().url().nullable().optional(),
    zaloUrl: z.string().url().nullable().optional(),
    footerDescription: z.string().max(2000).optional(),
    payment: bankTransferPatchSchema.nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one site setting must be provided.",
  });

export type CheckoutQuoteQuery = z.infer<typeof checkoutQuoteQuerySchema>;
export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
export type CouponValidateInput = z.infer<typeof couponValidateSchema>;
export type PageQuery = z.infer<typeof pageQuerySchema>;
export type AdminOrderQuery = z.infer<typeof adminOrderQuerySchema>;
export type SiteSettingsPatch = z.infer<typeof siteSettingsPatchSchema>;
export type BankTransferPatch = z.infer<typeof bankTransferPatchSchema>;
