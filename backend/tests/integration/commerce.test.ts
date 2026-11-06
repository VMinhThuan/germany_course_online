import { createHash, randomUUID } from "node:crypto";
import mongoose, { Types } from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/application.js";
import {
  AuditLog,
  Course,
  CourseSection,
  EmailLog,
  Enrollment,
  EnrollmentAdjustment,
  Lesson,
  Order,
  SiteSettings,
  User,
  UserSession,
} from "../../src/db/models/index.js";
import { createLogger } from "../../src/http/logger.js";
import { issueAccessToken } from "../../src/modules/auth/jwt.js";
import { FakeEmailService } from "../../src/modules/auth/email-service.js";
import { EmailOutboxWorker } from "../../src/modules/commerce/email-outbox-worker.js";
import { addUtcCalendarMonths } from "../../src/modules/commerce/dto.js";
import type { AppConfig } from "../../src/config/env.js";
import {
  clearTestDatabase,
  startTestDatabase,
  stopTestDatabase,
} from "../support/test-database.js";

type Actor = { userId: string; email: string; authorization: string };

let config: AppConfig;
let app: ReturnType<typeof createApp>;
let emailService: FakeEmailService;
let student: Actor;
let secondStudent: Actor;
let admin: Actor;

const paymentSettings = {
  enabled: true,
  bankName: "Test Bank",
  accountNumber: "0000000000",
  accountHolderName: "PANIVERSE TEST",
  qrUrl: "https://assets.example.test/test-only-qr.png",
  transferInstructions: "Use the exact order code in the transfer description.",
};

async function createActor(
  email: string,
  role: "STUDENT" | "ADMIN" = "STUDENT",
): Promise<Actor> {
  const user = await User.create({
    fullName: role === "ADMIN" ? "Commerce Admin" : "Commerce Student",
    email,
    passwordHash: "test-only-hash-not-used-by-access-token-auth",
    role,
    status: "ACTIVE",
  });
  const session = await UserSession.create({
    userId: user._id,
    refreshTokenHash: createHash("sha256").update(randomUUID()).digest("hex"),
    status: "ACTIVE",
    expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
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

async function createCourse(
  options: {
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    price?: string;
    durationMonths?: number;
  } = {},
) {
  return Course.create({
    code: `A1-${randomUUID().slice(0, 8)}`,
    title: "German A1 Foundations",
    slug: `german-a1-${randomUUID().slice(0, 8)}`,
    description: "A test course for the purchase flow.",
    shortDescription: "Test course.",
    objectives: ["Practice German"],
    requirements: [],
    level: "A1",
    thumbnailAssetId: null,
    bannerAssetId: null,
    introVideoAssetId: null,
    price: mongoose.Types.Decimal128.fromString(options.price ?? "1950000"),
    accessDurationMonths: options.durationMonths ?? 12,
    status: options.status ?? "PUBLISHED",
    sortOrder: 1,
    deletedAt: null,
  });
}

async function setupPaymentSettings() {
  await SiteSettings.create({
    _id: "site",
    siteName: "PAniverseDeutsch",
    heroTitle: "Known hero title",
    heroDescription: "Known hero description",
    footerDescription: "Known footer description",
    payment: paymentSettings,
    updatedAt: new Date(),
  });
}

function as(actor: Actor, method: "get" | "post" | "patch", path: string) {
  return request(app)[method](path).set("Authorization", actor.authorization);
}

describe("BE-03A purchase, manual approval, enrollment, and email outbox", () => {
  beforeAll(async () => {
    config = await startTestDatabase();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    emailService = new FakeEmailService();
    app = createApp(config, {
      logger: createLogger("test"),
      emailService,
      readiness: () => true,
    });
    student = await createActor("student-one@example.test");
    secondStudent = await createActor("student-two@example.test");
    admin = await createActor("admin@example.test", "ADMIN");
  });

  it("completes a purchase, transfer report, concurrent approval, and BE-02 entitlement journey", async () => {
    await setupPaymentSettings();
    const course = await createCourse({ durationMonths: 12 });
    const section = await CourseSection.create({
      courseId: course._id,
      title: "Chapter 1",
      description: "First chapter.",
      sectionType: "CHAPTER",
      sortOrder: 1,
      status: "PUBLISHED",
      deletedAt: null,
    });
    const lesson = await Lesson.create({
      sectionId: section._id,
      title: "First lesson",
      description: "A protected lesson.",
      content: { blocks: [{ type: "text", text: "Hallo" }] },
      lessonType: "LECTURE",
      estimatedMinutes: 5,
      countsTowardProgress: true,
      sortOrder: 1,
      status: "PUBLISHED",
      deletedAt: null,
    });

    const quote = await as(student, "get", "/api/v1/checkout/quote").query({
      courseId: course._id.toString(),
      orderType: "PURCHASE",
    });
    expect(quote.status).toBe(200);
    expect(quote.body.data).toMatchObject({
      coursePrice: "1950000",
      baseAmount: "1950000",
      discountAmount: "0",
      totalAmount: "1950000",
      currency: "VND",
      durationMonths: 12,
    });

    const created = await as(student, "post", "/api/v1/orders")
      .set("Idempotency-Key", "course-purchase-001")
      .send({ courseId: course._id.toString(), orderType: "PURCHASE" });
    expect(created.status).toBe(201);
    expect(created.body.data.order.status).toBe("PENDING");
    expect(created.body.data.order.totalAmount).toBe("1950000");
    expect(created.body.data.paymentInstructions.accountNumber).toBe(
      "0000000000",
    );
    const orderId = created.body.data.order.id as string;

    const unauthenticated = await request(app)
      .post("/api/v1/orders")
      .send({ courseId: course._id.toString(), orderType: "PURCHASE" });
    expect(unauthenticated.status).toBe(401);

    const replay = await as(student, "post", "/api/v1/orders")
      .set("Idempotency-Key", "course-purchase-001")
      .send({ courseId: course._id.toString(), orderType: "PURCHASE" });
    expect(replay.status).toBe(200);
    expect(replay.body.data.order.id).toBe(orderId);
    const changedPayload = await as(student, "post", "/api/v1/orders")
      .set("Idempotency-Key", "course-purchase-001")
      .send({
        courseId: new Types.ObjectId().toString(),
        orderType: "PURCHASE",
      });
    expect(changedPayload.status).toBe(409);
    expect(changedPayload.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");

    const forged = await as(student, "post", "/api/v1/orders").send({
      courseId: course._id.toString(),
      orderType: "PURCHASE",
      totalAmount: "1",
    });
    expect(forged.status).toBe(400);
    const foreignRead = await as(
      secondStudent,
      "get",
      `/api/v1/orders/${orderId}`,
    );
    expect(foreignRead.status).toBe(404);
    const foreignConfirmation = await as(
      secondStudent,
      "post",
      `/api/v1/orders/${orderId}/confirm-transfer`,
    ).send({});
    expect(foreignConfirmation.status).toBe(404);
    const beforePayment = await as(
      student,
      "get",
      `/api/v1/learn/lessons/${lesson._id}`,
    );
    expect(beforePayment.status).toBe(404);
    expect(
      (await as(student, "get", "/api/v1/me/dashboard")).body.data.courses,
    ).toHaveLength(0);

    const prematureApproval = await as(
      admin,
      "post",
      `/api/v1/admin/orders/${orderId}/approve`,
    ).send({});
    expect(prematureApproval.status).toBe(409);
    expect(prematureApproval.body.error.code).toBe("TRANSFER_NOT_SUBMITTED");
    const studentApproval = await as(
      student,
      "post",
      `/api/v1/admin/orders/${orderId}/approve`,
    ).send({});
    expect(studentApproval.status).toBe(403);

    const confirmation = await Promise.all([
      as(student, "post", `/api/v1/orders/${orderId}/confirm-transfer`).send(
        {},
      ),
      as(student, "post", `/api/v1/orders/${orderId}/confirm-transfer`).send(
        {},
      ),
    ]);
    expect(confirmation.map((response) => response.status)).toEqual([200, 200]);
    expect(confirmation[0].body.data.order.status).toBe("PENDING");
    expect(confirmation[0].body.data.order.paymentSubmittedAt).toBeTruthy();
    expect(
      await EmailLog.countDocuments({
        templateType: "TRANSFER_SUBMITTED_ADMIN",
      }),
    ).toBe(1);
    expect(await Enrollment.countDocuments({ userId: student.userId })).toBe(0);
    const stillLocked = await as(
      student,
      "get",
      `/api/v1/learn/lessons/${lesson._id}`,
    );
    expect(stillLocked.status).toBe(404);

    const adminQueue = await as(admin, "get", "/api/v1/admin/orders").query({
      status: "PENDING",
      paymentSubmitted: "true",
    });
    expect(adminQueue.status).toBe(200);
    expect(adminQueue.body.data.items).toHaveLength(1);
    expect(adminQueue.body.data.items[0].student.email).toBe(student.email);
    expect(adminQueue.body.data.items[0]).not.toHaveProperty(
      "student.passwordHash",
    );
    const adminOrderDetail = await as(
      admin,
      "get",
      `/api/v1/admin/orders/${orderId}`,
    );
    expect(adminOrderDetail.status).toBe(200);
    expect(adminOrderDetail.body.data.course.title).toBe(
      "German A1 Foundations",
    );
    expect(adminOrderDetail.body.data.student).not.toHaveProperty(
      "passwordHash",
    );

    const transferWorker = new EmailOutboxWorker(emailService, {
      ...(config.allowedOrigins[0]
        ? { frontendBaseUrl: config.allowedOrigins[0] }
        : {}),
    });
    expect(await transferWorker.runOnce()).toBe(1);
    expect(emailService.notificationDeliveries[0]?.to).toContain(admin.email);
    expect(emailService.notificationDeliveries[0]?.text).toContain(
      created.body.data.order.orderCode,
    );

    // The order's title, amount, and duration stay frozen even if the catalog changes.
    course.price = mongoose.Types.Decimal128.fromString("9999999");
    course.accessDurationMonths = 24;
    await course.save();

    const approvals = await Promise.all([
      as(admin, "post", `/api/v1/admin/orders/${orderId}/approve`).send({
        reviewNote: "Bank statement matched.",
      }),
      as(admin, "post", `/api/v1/admin/orders/${orderId}/approve`).send({}),
    ]);
    expect(
      approvals.filter((response) => response.status === 200),
    ).toHaveLength(1);
    expect(
      approvals.filter((response) => response.status === 409),
    ).toHaveLength(1);
    const approved = approvals.find((response) => response.status === 200)!;
    expect(approved.body.data.order.status).toBe("PAID");
    expect(approved.body.data.order.totalAmount).toBe("1950000");
    expect(approved.body.data.enrollment.expiresAt).toBe(
      addUtcCalendarMonths(
        new Date(approved.body.data.order.paidAt),
        12,
      ).toISOString(),
    );
    expect(
      await Enrollment.countDocuments({
        userId: student.userId,
        courseId: course._id,
      }),
    ).toBe(1);
    expect(
      await EnrollmentAdjustment.countDocuments({
        adjustmentType: "GRANT",
        orderId: orderId,
      }),
    ).toBe(1);
    expect(
      await AuditLog.countDocuments({
        action: "ORDER_APPROVED",
        entityId: new Types.ObjectId(orderId),
      }),
    ).toBe(1);
    expect(
      await EmailLog.countDocuments({ templateType: "ORDER_APPROVED_STUDENT" }),
    ).toBe(1);
    expect(await Order.countDocuments({ status: "PAID" })).toBe(1);

    const courseOverview = await as(
      student,
      "get",
      `/api/v1/me/courses/${course._id}`,
    );
    const studentCourses = await as(student, "get", "/api/v1/me/courses");
    const dashboard = await as(student, "get", "/api/v1/me/dashboard");
    const lessonAccess = await as(
      student,
      "get",
      `/api/v1/learn/lessons/${lesson._id}`,
    );
    expect(courseOverview.status).toBe(200);
    expect(studentCourses.body.data.items).toHaveLength(1);
    expect(dashboard.body.data.courses).toHaveLength(1);
    expect(lessonAccess.status).toBe(200);
    const studentOrder = await as(student, "get", `/api/v1/orders/${orderId}`);
    expect(studentOrder.status).toBe(200);
    expect(studentOrder.body.data).not.toHaveProperty("order.reviewNote");
    expect(studentOrder.body.data).not.toHaveProperty("order.reviewedById");
    expect(
      (await as(student, "get", "/api/v1/orders")).body.data.items,
    ).toHaveLength(1);

    emailService.notificationFailuresRemaining = 1;
    expect(await transferWorker.runOnce()).toBe(1);
    let studentOutbox = await EmailLog.findOne({
      templateType: "ORDER_APPROVED_STUDENT",
    }).lean();
    expect(studentOutbox?.status).toBe("PENDING");
    expect(studentOutbox?.attempts).toBe(1);
    expect((await Order.findById(orderId).lean())?.status).toBe("PAID");
    const retryTime = new Date(
      (studentOutbox?.availableAt.getTime() ?? Date.now()) + 1000,
    );
    const retryWorker = new EmailOutboxWorker(emailService, {
      now: () => retryTime,
      ...(config.allowedOrigins[0]
        ? { frontendBaseUrl: config.allowedOrigins[0] }
        : {}),
    });
    expect(await retryWorker.runOnce()).toBe(1);
    studentOutbox = await EmailLog.findOne({
      templateType: "ORDER_APPROVED_STUDENT",
    }).lean();
    expect(studentOutbox?.status).toBe("SENT");
    expect(studentOutbox?.providerMessageId).toMatch(/^fake-/);
    expect(emailService.notificationDeliveries.at(-1)?.to).toContain(
      student.email,
    );
    expect(emailService.notificationDeliveries.at(-1)?.text).toContain(
      "/student/courses/",
    );
  });

  it("fails closed for unconfigured payments, ineligible renewals, invalid coupons, invalid courses, and duplicate purchases", async () => {
    const course = await createCourse();
    const missingSettings = await as(student, "post", "/api/v1/orders").send({
      courseId: course._id.toString(),
      orderType: "PURCHASE",
    });
    expect(missingSettings.status).toBe(503);
    expect(missingSettings.body.error.code).toBe(
      "PAYMENT_CONFIGURATION_UNAVAILABLE",
    );
    expect(await Order.countDocuments({})).toBe(0);

    await setupPaymentSettings();
    const renew = await as(student, "get", "/api/v1/checkout/quote").query({
      courseId: course._id.toString(),
      orderType: "RENEWAL",
      renewalPlanId: new mongoose.Types.ObjectId().toString(),
    });
    expect(renew.status).toBe(409);
    expect(renew.body.error.code).toBe("RENEWAL_ENROLLMENT_REQUIRED");
    const coupon = await as(student, "get", "/api/v1/checkout/quote").query({
      courseId: course._id.toString(),
      orderType: "PURCHASE",
      couponCode: "SAVE10",
    });
    expect(coupon.status).toBe(422);
    expect(coupon.body.error.code).toBe("COUPON_NOT_APPLICABLE");

    const hidden = await createCourse({ status: "DRAFT" });
    const hiddenQuote = await as(
      student,
      "get",
      "/api/v1/checkout/quote",
    ).query({ courseId: hidden._id.toString(), orderType: "PURCHASE" });
    expect(hiddenQuote.status).toBe(404);
    const free = await createCourse({ price: "0" });
    const freeQuote = await as(student, "get", "/api/v1/checkout/quote").query({
      courseId: free._id.toString(),
      orderType: "PURCHASE",
    });
    expect(freeQuote.status).toBe(422);
    expect(freeQuote.body.error.code).toBe("ZERO_PRICE_UNSUPPORTED");

    await SiteSettings.updateOne(
      { _id: "site" },
      { $set: { payment: { enabled: false } } },
    );
    const disabledCourse = await createCourse();
    const disabledPayment = await as(student, "post", "/api/v1/orders").send({
      courseId: disabledCourse._id.toString(),
      orderType: "PURCHASE",
    });
    expect(disabledPayment.status).toBe(503);
    await SiteSettings.updateOne(
      { _id: "site" },
      { $set: { payment: paymentSettings } },
    );

    const created = await as(student, "post", "/api/v1/orders").send({
      courseId: course._id.toString(),
      orderType: "PURCHASE",
    });
    expect(created.status).toBe(201);
    const duplicatePurchase = await as(student, "post", "/api/v1/orders").send({
      courseId: course._id.toString(),
      orderType: "PURCHASE",
    });
    expect(duplicatePurchase.status).toBe(409);
    expect(duplicatePurchase.body.error.code).toBe("PENDING_PURCHASE_EXISTS");

    const studentSettingsPatch = await as(
      student,
      "patch",
      "/api/v1/admin/site-settings",
    ).send({ payment: { enabled: false } });
    expect(studentSettingsPatch.status).toBe(403);
  });

  it("rolls back order, enrollment, adjustment, audit, and email when approval outbox insertion conflicts", async () => {
    await setupPaymentSettings();
    const course = await createCourse();
    const created = await as(student, "post", "/api/v1/orders").send({
      courseId: course._id.toString(),
      orderType: "PURCHASE",
    });
    const orderId = created.body.data.order.id as string;
    await as(
      student,
      "post",
      `/api/v1/orders/${orderId}/confirm-transfer`,
    ).send({});
    await EmailLog.create({
      userId: student.userId,
      recipientType: "STUDENT",
      recipientEmail: student.email,
      templateType: "ORDER_APPROVED_STUDENT",
      subject: "existing test row",
      templateData: { courseTitle: "German A1" },
      status: "PENDING",
      dedupeKey: `${orderId}:ORDER_APPROVED_STUDENT`,
      availableAt: new Date(),
    });

    const failed = await as(
      admin,
      "post",
      `/api/v1/admin/orders/${orderId}/approve`,
    ).send({});
    expect(failed.status).toBe(409);
    const order = await Order.findById(orderId).lean();
    expect(order?.status).toBe("PENDING");
    expect(
      await Enrollment.countDocuments({
        userId: student.userId,
        courseId: course._id,
      }),
    ).toBe(0);
    expect(await EnrollmentAdjustment.countDocuments({ orderId })).toBe(0);
    expect(
      await AuditLog.countDocuments({
        action: "ORDER_APPROVED",
        entityId: new Types.ObjectId(orderId),
      }),
    ).toBe(0);
    expect(
      await EmailLog.countDocuments({
        dedupeKey: `${orderId}:ORDER_APPROVED_STUDENT`,
      }),
    ).toBe(1);
  });

  it("provides defaults before the first settings save and allows admin initialization", async () => {
    const initial = await as(admin, "get", "/api/v1/admin/site-settings");
    expect(initial.status).toBe(200);
    expect(initial.body.data).toMatchObject({
      siteName: "PAniverseDeutsch",
      heroTitle: "",
      heroDescription: "",
      footerDescription: "",
      payment: null,
    });
    expect(await SiteSettings.countDocuments()).toBe(0);

    const saved = await as(admin, "patch", "/api/v1/admin/site-settings").send({
      heroTitle: "Chào mừng",
    });
    expect(saved.status).toBe(200);
    expect(saved.body.data.heroTitle).toBe("Chào mừng");
    expect(await SiteSettings.countDocuments()).toBe(1);
  });

  it("updates bank settings without overwriting unrelated settings or leaking them publicly", async () => {
    await SiteSettings.create({
      _id: "site",
      siteName: "Existing Site Name",
      heroTitle: "Keep this title",
      heroDescription: "Keep this description",
      footerDescription: "Keep this footer",
      payment: { enabled: false },
      updatedAt: new Date(),
    });
    const patch = await as(admin, "patch", "/api/v1/admin/site-settings").send({
      payment: paymentSettings,
    });
    expect(patch.status).toBe(200);
    expect(patch.body.data.payment.enabled).toBe(true);
    const settings = await SiteSettings.findById("site")
      .select("+payment")
      .lean();
    expect(settings?.siteName).toBe("Existing Site Name");
    expect(settings?.heroTitle).toBe("Keep this title");
    expect(settings?.footerDescription).toBe("Keep this footer");

    const publicSettings = await request(app).get(
      "/api/v1/site-settings/public",
    );
    expect(publicSettings.status).toBe(200);
    expect(publicSettings.body.data).not.toHaveProperty("payment");
    expect(
      JSON.stringify(
        await AuditLog.find({ entityType: "SITE_SETTINGS" }).lean(),
      ),
    ).not.toContain("0000000000");

    const order = await as(student, "post", "/api/v1/orders").send({
      courseId: (await createCourse())._id.toString(),
      orderType: "PURCHASE",
    });
    expect(order.status).toBe(201);
    expect(order.body.data.paymentInstructions.qrUrl).toBe(
      paymentSettings.qrUrl,
    );
  });

  it("preserves a pre-existing enrollment when an order reaches approval", async () => {
    await setupPaymentSettings();
    const course = await createCourse();
    const created = await as(student, "post", "/api/v1/orders").send({
      courseId: course._id.toString(),
      orderType: "PURCHASE",
    });
    const orderId = created.body.data.order.id as string;
    await as(
      student,
      "post",
      `/api/v1/orders/${orderId}/confirm-transfer`,
    ).send({});
    const expiry = new Date("2027-06-01T00:00:00.000Z");
    const existing = await Enrollment.create({
      userId: new Types.ObjectId(student.userId),
      courseId: course._id,
      sourceOrderId: null,
      activatedAt: new Date("2026-06-01T00:00:00.000Z"),
      expiresAt: expiry,
      status: "REVOKED",
    });

    const approval = await as(
      admin,
      "post",
      `/api/v1/admin/orders/${orderId}/approve`,
    ).send({});
    expect(approval.status).toBe(409);
    expect(approval.body.error.code).toBe("ENROLLMENT_ALREADY_EXISTS");
    expect((await Enrollment.findById(existing._id).lean())?.expiresAt).toEqual(
      expiry,
    );
    expect((await Order.findById(orderId).lean())?.status).toBe("PENDING");
    expect(await EnrollmentAdjustment.countDocuments({ orderId })).toBe(0);
    expect(
      await AuditLog.countDocuments({
        action: "ORDER_APPROVED",
        entityId: new Types.ObjectId(orderId),
      }),
    ).toBe(0);
    expect(
      await EmailLog.countDocuments({
        dedupeKey: `${orderId}:ORDER_APPROVED_STUDENT`,
      }),
    ).toBe(0);

    const secondOrder = await as(student, "post", "/api/v1/orders").send({
      courseId: course._id.toString(),
      orderType: "PURCHASE",
    });
    expect(secondOrder.status).toBe(409);
    expect(secondOrder.body.error.code).toBe("PURCHASE_ALREADY_ENROLLED");
  });

  it("limits retry attempts and leaves unavailable email delivery unsent", async () => {
    await setupPaymentSettings();
    const course = await createCourse();
    const created = await as(student, "post", "/api/v1/orders").send({
      courseId: course._id.toString(),
      orderType: "PURCHASE",
    });
    const orderId = created.body.data.order.id as string;
    await as(
      student,
      "post",
      `/api/v1/orders/${orderId}/confirm-transfer`,
    ).send({});

    const unavailableWorker = new EmailOutboxWorker({
      available: false,
      async sendPasswordReset() {
        throw new Error("unavailable");
      },
      async sendNotification() {
        throw new Error("unavailable");
      },
    });
    expect(await unavailableWorker.runOnce()).toBe(0);
    expect(
      (
        await EmailLog.findOne({
          templateType: "TRANSFER_SUBMITTED_ADMIN",
        }).lean()
      )?.status,
    ).toBe("PENDING");

    emailService.notificationFailuresRemaining = 5;
    let now = new Date(Date.now() + 5_000);
    const worker = new EmailOutboxWorker(emailService, { now: () => now });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(await worker.runOnce(1)).toBe(1);
      const job = await EmailLog.findOne({
        templateType: "TRANSFER_SUBMITTED_ADMIN",
      }).lean();
      if (attempt < 4) {
        expect(job?.status).toBe("PENDING");
        now = new Date((job?.availableAt.getTime() ?? now.getTime()) + 1);
      } else {
        expect(job?.status).toBe("FAILED");
        expect(job?.attempts).toBe(5);
        expect(job?.errorMessage).toContain("retry limit");
        expect(job?.lastErrorCode).toBe("EMAIL_DELIVERY_FAILED");
      }
    }
    expect(emailService.notificationDeliveries).toHaveLength(0);
    expect((await Order.findById(orderId).lean())?.status).toBe("PENDING");
  });

  it("reclaims an expired outbox lease after worker restart and does not redeliver a sent job", async () => {
    const now = new Date("2026-10-01T12:00:00.000Z");
    const job = await EmailLog.create({
      userId: new Types.ObjectId(student.userId),
      recipientType: "STUDENT",
      recipientEmail: student.email,
      templateType: "ORDER_APPROVED_STUDENT",
      subject: "Test-only course approval",
      templateData: {
        courseTitle: "Synthetic course",
        orderCode: "TEST-LEASE-001",
        durationMonths: 12,
        expiresAt: "2027-10-01T12:00:00.000Z",
        learningUrl: "/learn/courses/synthetic",
      },
      status: "PROCESSING",
      dedupeKey: "be05-test-expired-outbox-lease",
      attempts: 1,
      availableAt: new Date(now.getTime() - 120_000),
      leaseExpiresAt: new Date(now.getTime() - 1),
      leaseToken: "expired-test-lease-token",
    });

    const restartedWorker = new EmailOutboxWorker(emailService, {
      now: () => now,
    });
    expect(await restartedWorker.runOnce()).toBe(1);
    const delivered = await EmailLog.findById(job._id).lean();
    expect(delivered?.status).toBe("SENT");
    expect(delivered?.attempts).toBe(2);
    expect(emailService.notificationDeliveries).toHaveLength(1);
    expect(emailService.notificationDeliveries[0]?.text).toContain(
      "TEST-LEASE-001",
    );

    const nextWorker = new EmailOutboxWorker(emailService, { now: () => now });
    expect(await nextWorker.runOnce()).toBe(0);
    expect(emailService.notificationDeliveries).toHaveLength(1);
  });

  it("clamps UTC calendar-month grants at month ends and leap years", () => {
    expect(
      addUtcCalendarMonths(
        new Date("2025-01-31T18:30:00.000Z"),
        1,
      ).toISOString(),
    ).toBe("2025-02-28T18:30:00.000Z");
    expect(
      addUtcCalendarMonths(
        new Date("2024-01-31T18:30:00.000Z"),
        1,
      ).toISOString(),
    ).toBe("2024-02-29T18:30:00.000Z");
    expect(
      addUtcCalendarMonths(
        new Date("2024-02-29T00:00:00.000Z"),
        12,
      ).toISOString(),
    ).toBe("2025-02-28T00:00:00.000Z");
  });
});
