import { createHash, randomUUID } from "node:crypto";
import { Types } from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import {
  AuditLog,
  Coupon,
  CouponRedemption,
  Course,
  ExerciseProgress,
  EmailLog,
  Enrollment,
  EnrollmentAdjustment,
  LessonNote,
  LessonProgress,
  Order,
  SiteSettings,
  User,
  UserSession,
} from "../../src/db/models/index.js";
import { createLogger } from "../../src/http/logger.js";
import { issueAccessToken } from "../../src/modules/auth/jwt.js";
import { addUtcCalendarMonths } from "../../src/modules/commerce/dto.js";
import { FakeEmailService } from "../../src/modules/auth/email-service.js";
import type { AppConfig } from "../../src/config/env.js";
import {
  clearTestDatabase,
  startTestDatabase,
  stopTestDatabase,
} from "../support/test-database.js";

type Actor = { userId: string; email: string; authorization: string };

let config: AppConfig;
let app: ReturnType<typeof createApp>;
let student: Actor;
let secondStudent: Actor;
let admin: Actor;

async function createActor(
  email: string,
  role: "STUDENT" | "ADMIN" = "STUDENT",
): Promise<Actor> {
  const user = await User.create({
    fullName: role === "ADMIN" ? "Business Admin" : "Business Student",
    email,
    passwordHash: "test-only-hash",
    role,
    status: "ACTIVE",
  });
  const session = await UserSession.create({
    userId: user._id,
    refreshTokenHash: createHash("sha256").update(randomUUID()).digest("hex"),
    status: "ACTIVE",
    expiresAt: new Date(Date.now() + 86_400_000),
    roleAtIssue: role,
  });
  const token = await issueAccessToken(config, {
    sub: user._id.toString(),
    sid: session._id.toString(),
    role,
  });
  return {
    userId: user._id.toString(),
    email,
    authorization: `Bearer ${token}`,
  };
}

async function createCourse(price = "1950000") {
  return Course.create({
    code: `A1-${randomUUID().slice(0, 8)}`,
    title: "German A1 Business Flow",
    slug: `german-a1-${randomUUID().slice(0, 8)}`,
    description: "Integration course.",
    shortDescription: "Integration course.",
    objectives: ["Learn German"],
    requirements: [],
    level: "A1",
    thumbnailAssetId: null,
    bannerAssetId: null,
    introVideoAssetId: null,
    price: Types.Decimal128.fromString(price),
    accessDurationMonths: 12,
    status: "PUBLISHED",
    sortOrder: 1,
    deletedAt: null,
  });
}

async function setupPayment() {
  await SiteSettings.create({
    _id: "site",
    siteName: "PAniverseDeutsch",
    heroTitle: "Test",
    heroDescription: "Test",
    footerDescription: "Test",
    payment: {
      enabled: true,
      bankName: "Test Bank",
      accountNumber: "00000000",
      accountHolderName: "TEST ACCOUNT",
      qrUrl: "https://assets.example.test/qr.png",
      transferInstructions: "Use the order code.",
    },
    updatedAt: new Date(),
  });
}

function as(
  actor: Actor,
  method: "get" | "post" | "patch" | "delete",
  path: string,
) {
  return request(app)[method](path).set("Authorization", actor.authorization);
}

describe("BE-03C renewal, coupon, cancellation, and Admin enrollment transactions", () => {
  beforeAll(async () => {
    config = await startTestDatabase();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    app = createApp(config, {
      logger: createLogger("test"),
      emailService: new FakeEmailService(),
      readiness: () => true,
    });
    student = await createActor("be03c-student@example.test");
    secondStudent = await createActor("be03c-second@example.test");
    admin = await createActor("be03c-admin@example.test", "ADMIN");
  });

  it("prices and approves a renewal against an expired enrollment without replacing it", async () => {
    await setupPayment();
    const previouslyPurchasedCourse = await createCourse();
    const previousPurchase = await as(student, "post", "/api/v1/orders").send({
      courseId: previouslyPurchasedCourse.id,
      orderType: "PURCHASE",
    });
    await as(
      student,
      "post",
      `/api/v1/orders/${previousPurchase.body.data.order.id}/confirm-transfer`,
    ).send({});
    expect(
      (
        await as(
          admin,
          "post",
          `/api/v1/admin/orders/${previousPurchase.body.data.order.id}/approve`,
        ).send({})
      ).status,
    ).toBe(200);

    const course = await createCourse();
    const enrollment = await Enrollment.create({
      userId: new Types.ObjectId(student.userId),
      courseId: course._id,
      sourceOrderId: null,
      activatedAt: new Date("2023-01-31T12:00:00.000Z"),
      expiresAt: new Date("2024-01-31T12:00:00.000Z"),
      status: "ACTIVE",
    });
    const lessonId = new Types.ObjectId();
    const exerciseId = new Types.ObjectId();
    const progressStartedAt = new Date("2023-02-01T12:00:00.000Z");
    const progressCompletedAt = new Date("2023-02-02T12:00:00.000Z");
    await LessonProgress.create({
      userId: new Types.ObjectId(student.userId),
      lessonId,
      status: "COMPLETED",
      startedAt: progressStartedAt,
      completedAt: progressCompletedAt,
      lastAccessedAt: progressCompletedAt,
    });
    await ExerciseProgress.create({
      userId: new Types.ObjectId(student.userId),
      exerciseId,
      status: "COMPLETED",
      completionSource: "QUIZ",
      startedAt: progressStartedAt,
      completedAt: progressCompletedAt,
    });
    await LessonNote.create({
      userId: new Types.ObjectId(student.userId),
      lessonId,
      content: "Keep this note through renewal.",
    });
    const planResponse = await as(
      admin,
      "post",
      `/api/v1/admin/courses/${course.id}/renewal-plans`,
    ).send({
      title: "A1 annual renewal",
      durationMonths: 12,
      price: "490000",
    });
    expect(planResponse.status).toBe(201);
    const planId = planResponse.body.data.id as string;
    const renewalCoupon = await as(admin, "post", "/api/v1/admin/coupons").send(
      {
        code: "RENEW5",
        discountType: "PERCENT",
        discountValue: "5",
      },
    );
    expect(renewalCoupon.status).toBe(201);
    const plans = await as(
      student,
      "get",
      `/api/v1/renewals/courses/${course.id}/plans`,
    );
    expect(plans.status).toBe(200);
    expect(plans.body.data.items[0]).toMatchObject({
      id: planId,
      price: "490000",
      durationMonths: 12,
    });
    expect(
      (
        await as(
          secondStudent,
          "get",
          `/api/v1/renewals/courses/${course.id}/plans`,
        )
      ).status,
    ).toBe(403);

    const quote = await as(student, "get", "/api/v1/checkout/quote").query({
      courseId: course.id,
      orderType: "RENEWAL",
      renewalPlanId: planId,
      couponCode: "RENEW5",
    });
    expect(quote.body.data).toMatchObject({
      baseAmount: "490000",
      couponDiscountAmount: "24500",
      automaticDiscountAmount: "0",
      discountSource: "COUPON",
      totalAmount: "465500",
    });

    const order = await as(student, "post", "/api/v1/orders")
      .set("Idempotency-Key", "renewal-order-0001")
      .send({
        courseId: course.id,
        orderType: "RENEWAL",
        renewalPlanId: planId,
        couponCode: "RENEW5",
      });
    expect(order.status).toBe(201);
    const orderId = order.body.data.order.id as string;
    expect(order.body.data.order).toMatchObject({
      orderType: "RENEWAL",
      renewalPlanId: planId,
      renewalPlanPriceSnapshot: "490000",
      baseAmount: "490000",
      discountAmount: "24500",
      discountSource: "COUPON",
      totalAmount: "465500",
      status: "PENDING",
    });
    expect(
      (await Enrollment.findById(enrollment._id))?.expiresAt.toISOString(),
    ).toBe("2024-01-31T12:00:00.000Z");

    await as(admin, "patch", `/api/v1/admin/renewal-plans/${planId}`).send({
      price: "650000",
      durationMonths: 18,
    });
    await as(
      student,
      "post",
      `/api/v1/orders/${orderId}/confirm-transfer`,
    ).send({});
    const approvalResponses = await Promise.all([
      as(admin, "post", `/api/v1/admin/orders/${orderId}/approve`).send({}),
      as(admin, "post", `/api/v1/admin/orders/${orderId}/approve`).send({}),
    ]);
    expect(approvalResponses.map((response) => response.status).sort()).toEqual(
      [200, 409],
    );
    const approved = approvalResponses.find(
      (response) => response.status === 200,
    )!;
    expect(approved.status).toBe(200);
    expect(approved.body.data.order.totalAmount).toBe("465500");
    expect(approved.body.data.enrollment.id).toBe(enrollment.id);
    expect(
      (await Enrollment.find({ userId: student.userId, courseId: course._id }))
        .length,
    ).toBe(1);
    expect(
      (await Enrollment.findById(enrollment._id))?.sourceOrderId,
    ).toBeNull();
    expect(approved.body.data.enrollment.expiresAt).toBe(
      addUtcCalendarMonths(
        new Date(approved.body.data.order.paidAt),
        12,
      ).toISOString(),
    );
    expect(
      await EnrollmentAdjustment.countDocuments({
        enrollmentId: enrollment._id,
        adjustmentType: "RENEW",
        orderId: new Types.ObjectId(orderId),
      }),
    ).toBe(1);
    expect(
      await EmailLog.countDocuments({
        templateType: "RENEWAL_APPROVED_STUDENT",
        dedupeKey: `${orderId}:RENEWAL_APPROVED_STUDENT`,
      }),
    ).toBe(1);
    expect(
      (await CouponRedemption.findOne({ orderId: new Types.ObjectId(orderId) }))
        ?.status,
    ).toBe("REDEEMED");
    expect(
      (await Coupon.findById(renewalCoupon.body.data.id))?.reservedCount,
    ).toBe(0);
    expect(
      (await Coupon.findById(renewalCoupon.body.data.id))?.redemptionCount,
    ).toBe(1);
    expect(
      await LessonProgress.findOne({ userId: student.userId, lessonId }),
    ).toMatchObject({
      status: "COMPLETED",
      completedAt: progressCompletedAt,
    });
    expect(
      await ExerciseProgress.findOne({ userId: student.userId, exerciseId }),
    ).toMatchObject({
      status: "COMPLETED",
      completionSource: "QUIZ",
      completedAt: progressCompletedAt,
    });
    expect(
      await LessonNote.findOne({ userId: student.userId, lessonId }),
    ).toMatchObject({ content: "Keep this note through renewal." });
  });

  it("validates coupons read-only, reserves capacity, and releases it once on either cancellation path", async () => {
    await setupPayment();
    const course = await createCourse();
    const createdCoupon = await as(admin, "post", "/api/v1/admin/coupons").send(
      {
        code: "  save10  ",
        discountType: "PERCENT",
        discountValue: "10",
        maxDiscount: "100000",
        usageLimit: 2,
      },
    );
    expect(createdCoupon.status).toBe(201);
    expect(createdCoupon.body.data.code).toBe("SAVE10");
    const couponId = createdCoupon.body.data.id as string;
    const validated = await as(
      student,
      "post",
      "/api/v1/coupons/validate",
    ).send({
      courseId: course.id,
      orderType: "PURCHASE",
      code: "save10",
    });
    expect(validated.status).toBe(200);
    expect(validated.body.data).toMatchObject({
      valid: true,
      discountType: "PERCENT",
      potentialDiscountAmount: "100000",
      discountSource: "COUPON",
      totalAmount: "1850000",
    });
    expect((await Coupon.findById(couponId))?.reservedCount).toBe(0);

    const first = await as(student, "post", "/api/v1/orders").send({
      courseId: course.id,
      orderType: "PURCHASE",
      couponCode: "SAVE10",
    });
    const firstId = first.body.data.order.id as string;
    expect(first.status).toBe(201);
    expect(first.body.data.order.discountAmount).toBe("100000");
    expect((await Coupon.findById(couponId))?.reservedCount).toBe(1);
    expect(
      await CouponRedemption.findOne({ orderId: firstId, status: "RESERVED" }),
    ).toBeTruthy();
    expect(
      (await as(secondStudent, "post", `/api/v1/orders/${firstId}/cancel`))
        .status,
    ).toBe(404);
    expect(
      (await as(student, "post", `/api/v1/orders/${firstId}/cancel`)).status,
    ).toBe(200);
    expect(
      (await as(student, "post", `/api/v1/orders/${firstId}/cancel`)).status,
    ).toBe(200);
    expect((await Coupon.findById(couponId))?.reservedCount).toBe(0);
    expect((await CouponRedemption.findOne({ orderId: firstId }))?.status).toBe(
      "RELEASED",
    );

    const second = await as(student, "post", "/api/v1/orders").send({
      courseId: course.id,
      orderType: "PURCHASE",
      couponCode: "SAVE10",
    });
    const secondId = second.body.data.order.id as string;
    await as(
      student,
      "post",
      `/api/v1/orders/${secondId}/confirm-transfer`,
    ).send({});
    const studentCancelAfterTransfer = await as(
      student,
      "post",
      `/api/v1/orders/${secondId}/cancel`,
    ).send({});
    expect(studentCancelAfterTransfer.status).toBe(409);
    expect((await Order.findById(secondId))?.status).toBe("PENDING");
    const missingSafety = await as(
      admin,
      "post",
      `/api/v1/admin/orders/${secondId}/cancel`,
    ).send({ reason: "Need reconciliation." });
    expect(missingSafety.status).toBe(400);
    expect((await Order.findById(secondId))?.status).toBe("PENDING");
    const cancelled = await as(
      admin,
      "post",
      `/api/v1/admin/orders/${secondId}/cancel`,
    ).send({
      reason: "Bank statement checked with the operator.",
      reconciliationOutcome: "NO_FUNDS_RECEIVED",
    });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.order.status).toBe("CANCELLED");
    expect(cancelled.body.data.couponReservation).toMatchObject({
      code: "SAVE10",
      status: "RELEASED",
    });
    expect((await Coupon.findById(couponId))?.reservedCount).toBe(0);
    expect(
      await EmailLog.countDocuments({
        templateType: "ORDER_CANCELLED_STUDENT",
        dedupeKey: `${secondId}:ORDER_CANCELLED_STUDENT`,
      }),
    ).toBe(1);
    expect(
      await AuditLog.countDocuments({
        action: "ORDER_CANCELLED_BY_ADMIN",
        entityId: new Types.ObjectId(secondId),
      }),
    ).toBe(1);

    const paidOrder = await as(student, "post", "/api/v1/orders").send({
      courseId: course.id,
      orderType: "PURCHASE",
      couponCode: "SAVE10",
    });
    expect(paidOrder.status).toBe(201);
    const paidOrderId = paidOrder.body.data.order.id as string;
    await as(
      student,
      "post",
      `/api/v1/orders/${paidOrderId}/confirm-transfer`,
    ).send({});
    expect(
      (
        await as(
          admin,
          "post",
          `/api/v1/admin/orders/${paidOrderId}/approve`,
        ).send({})
      ).status,
    ).toBe(200);
    expect(
      (await CouponRedemption.findOne({ orderId: paidOrderId }))?.status,
    ).toBe("REDEEMED");
    expect((await Coupon.findById(couponId))?.redemptionCount).toBe(1);
    expect(
      (
        await as(student, "post", `/api/v1/orders/${paidOrderId}/cancel`).send(
          {},
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await as(
          admin,
          "post",
          `/api/v1/admin/orders/${paidOrderId}/cancel`,
        ).send({
          reason: "Already paid.",
          reconciliationOutcome: "NO_FUNDS_RECEIVED",
        })
      ).status,
    ).toBe(409);
    expect((await Order.findById(paidOrderId))?.status).toBe("PAID");
  });

  it("applies the second paid-purchase discount without stacking or reserving a tied coupon", async () => {
    await setupPayment();
    const firstCourse = await createCourse();
    const firstOrder = await as(student, "post", "/api/v1/orders").send({
      courseId: firstCourse.id,
      orderType: "PURCHASE",
    });
    expect(firstOrder.body.data.order.discountAmount).toBe("0");
    await as(
      student,
      "post",
      `/api/v1/orders/${firstOrder.body.data.order.id}/confirm-transfer`,
    ).send({});
    const paid = await as(
      admin,
      "post",
      `/api/v1/admin/orders/${firstOrder.body.data.order.id}/approve`,
    ).send({});
    expect(paid.status).toBe(200);

    const secondCourse = await createCourse();
    const coupon = await as(admin, "post", "/api/v1/admin/coupons").send({
      code: "FIVE",
      discountType: "PERCENT",
      discountValue: "5",
    });
    const quote = await as(student, "get", "/api/v1/checkout/quote").query({
      courseId: secondCourse.id,
      orderType: "PURCHASE",
      couponCode: "FIVE",
    });
    expect(quote.status).toBe(200);
    expect(quote.body.data).toMatchObject({
      automaticDiscountAmount: "97500",
      couponDiscountAmount: "97500",
      discountAmount: "97500",
      discountSource: "AUTOMATIC_5_PERCENT",
      totalAmount: "1852500",
    });
    const second = await as(student, "post", "/api/v1/orders").send({
      courseId: secondCourse.id,
      orderType: "PURCHASE",
      couponCode: "FIVE",
    });
    expect(second.status).toBe(201);
    expect(second.body.data.order).toMatchObject({
      discountAmount: "97500",
      discountSource: "AUTOMATIC_5_PERCENT",
      couponId: null,
    });
    expect((await Coupon.findById(coupon.body.data.id))?.reservedCount).toBe(0);
    expect(
      await CouponRedemption.countDocuments({
        couponId: new Types.ObjectId(coupon.body.data.id),
      }),
    ).toBe(0);

    const largerCoupon = await as(admin, "post", "/api/v1/admin/coupons").send({
      code: "TENPERCENT",
      discountType: "PERCENT",
      discountValue: "10",
    });
    const thirdCourse = await createCourse();
    const largerQuote = await as(
      student,
      "get",
      "/api/v1/checkout/quote",
    ).query({
      courseId: thirdCourse.id,
      orderType: "PURCHASE",
      couponCode: "TENPERCENT",
    });
    expect(largerQuote.body.data).toMatchObject({
      couponDiscountAmount: "195000",
      automaticDiscountAmount: "97500",
      discountSource: "COUPON",
      discountAmount: "195000",
      totalAmount: "1755000",
    });
    const third = await as(student, "post", "/api/v1/orders").send({
      courseId: thirdCourse.id,
      orderType: "PURCHASE",
      couponCode: "TENPERCENT",
    });
    expect(third.status).toBe(201);
    expect(third.body.data.order).toMatchObject({
      discountSource: "COUPON",
      discountAmount: "195000",
      couponId: largerCoupon.body.data.id,
    });
  });

  it("makes Admin enrollment lifecycle changes audited, idempotent, and order-free", async () => {
    const course = await createCourse();
    const grant = await as(admin, "post", "/api/v1/admin/enrollments")
      .set("Idempotency-Key", "grant-access-0001")
      .send({
        userId: student.userId,
        courseId: course.id,
        durationMonths: 2,
        reason: "Pilot access.",
      });
    expect(grant.status).toBe(201);
    const enrollmentId = grant.body.data.enrollment.id as string;
    const replay = await as(admin, "post", "/api/v1/admin/enrollments")
      .set("Idempotency-Key", "grant-access-0001")
      .send({
        userId: student.userId,
        courseId: course.id,
        durationMonths: 2,
        reason: "Pilot access.",
      });
    expect(replay.body.data.enrollment.id).toBe(enrollmentId);
    expect(
      await Enrollment.countDocuments({
        userId: student.userId,
        courseId: course._id,
      }),
    ).toBe(1);
    expect(await Order.countDocuments({})).toBe(0);

    const revoke = await as(
      admin,
      "post",
      `/api/v1/admin/enrollments/${enrollmentId}/revoke`,
    )
      .set("Idempotency-Key", "revoke-access-0001")
      .send({ reason: "Access review." });
    expect(revoke.status).toBe(200);
    expect((await Enrollment.findById(enrollmentId))?.status).toBe("REVOKED");
    await Enrollment.updateOne(
      { _id: enrollmentId },
      { $set: { expiresAt: new Date("2020-01-01T00:00:00.000Z") } },
    );
    const restoreMissingExtension = await as(
      admin,
      "post",
      `/api/v1/admin/enrollments/${enrollmentId}/restore`,
    )
      .set("Idempotency-Key", "restore-access-0001")
      .send({ reason: "Return access." });
    expect(restoreMissingExtension.status).toBe(422);
    const restored = await as(
      admin,
      "post",
      `/api/v1/admin/enrollments/${enrollmentId}/restore`,
    )
      .set("Idempotency-Key", "restore-access-0002")
      .send({ reason: "Return access with two months.", extensionMonths: 2 });
    expect(restored.status).toBe(200);
    expect((await Enrollment.findById(enrollmentId))?.status).toBe("ACTIVE");
    const beforeExtend = (await Enrollment.findById(enrollmentId))!.expiresAt;
    const extended = await as(
      admin,
      "post",
      `/api/v1/admin/enrollments/${enrollmentId}/extend`,
    )
      .set("Idempotency-Key", "extend-access-0001")
      .send({ reason: "Service recovery.", durationMonths: 1 });
    expect(extended.status).toBe(200);
    expect(
      (await Enrollment.findById(enrollmentId))?.expiresAt.toISOString(),
    ).toBe(addUtcCalendarMonths(beforeExtend, 1).toISOString());
    expect(
      await EnrollmentAdjustment.countDocuments({
        enrollmentId,
        adjustmentType: { $in: ["GRANT", "REVOKE", "RESTORE", "RENEW"] },
      }),
    ).toBe(4);
    expect(
      await AuditLog.countDocuments({
        entityType: "ENROLLMENT",
        entityId: new Types.ObjectId(enrollmentId),
      }),
    ).toBe(4);
    expect(await EmailLog.countDocuments({ userId: student.userId })).toBe(4);
  });

  it("serializes concurrent reservations of the final coupon use", async () => {
    await setupPayment();
    const coupon = await as(admin, "post", "/api/v1/admin/coupons").send({
      code: "LASTONE",
      discountType: "FIXED",
      discountValue: "25000",
      usageLimit: 1,
    });
    const firstCourse = await createCourse();
    const secondCourse = await createCourse();
    const results = await Promise.all([
      as(student, "post", "/api/v1/orders").send({
        courseId: firstCourse.id,
        orderType: "PURCHASE",
        couponCode: "LASTONE",
      }),
      as(secondStudent, "post", "/api/v1/orders").send({
        courseId: secondCourse.id,
        orderType: "PURCHASE",
        couponCode: "LASTONE",
      }),
    ]);
    expect(results.filter((response) => response.status === 201)).toHaveLength(
      1,
    );
    expect(results.filter((response) => response.status >= 400)).toHaveLength(
      1,
    );
    expect(
      await CouponRedemption.countDocuments({
        couponId: new Types.ObjectId(coupon.body.data.id),
        status: "RESERVED",
      }),
    ).toBe(1);
    expect((await Coupon.findById(coupon.body.data.id))?.reservedCount).toBe(1);
  });
});
