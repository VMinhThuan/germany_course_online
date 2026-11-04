import { createHash, randomBytes } from "node:crypto";
import mongoose, { Types } from "mongoose";
import type { AuditLogFields, OrderFields } from "../../db/models/index.js";
import {
  AuditLog,
  Coupon,
  CouponRedemption,
  Course,
  EmailLog,
  Enrollment,
  EnrollmentAdjustment,
  MediaAsset,
  Order,
  RenewalPlan,
  SiteSettings,
  User,
} from "../../db/models/index.js";
import { withTransaction } from "../../db/connection.js";
import { AppError, conflict, notFound } from "../../shared/errors.js";
import {
  addUtcCalendarMonths,
  amountAsVnd,
  enrollmentDto,
  orderDto,
  toIso,
  toPaymentInstructions,
} from "./dto.js";
import type {
  AdminOrderQuery,
  CouponValidateInput,
  CheckoutQuoteQuery,
  OrderCreateInput,
  PageQuery,
  SiteSettingsPatch,
} from "./schemas.js";
import {
  calculateAutomaticFivePercent,
  calculateCouponDiscount,
  chooseDiscount,
  normalizeCouponCode,
} from "./pricing.js";

const PAYMENT_CONFIGURATION_UNAVAILABLE = () =>
  new AppError(
    503,
    "PAYMENT_CONFIGURATION_UNAVAILABLE",
    "Bank transfer instructions are not configured for checkout.",
  );

type Page<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};

type CheckoutInput = {
  courseId: string;
  orderType: "PURCHASE" | "RENEWAL";
  renewalPlanId?: string | null | undefined;
  couponCode?: string | null | undefined;
};

type CheckoutPricing = {
  courseId: string;
  orderType: "PURCHASE" | "RENEWAL";
  courseTitle: string;
  coursePrice: string;
  baseAmount: string;
  discountAmount: string;
  discountSource: "NONE" | "COUPON" | "AUTOMATIC_5_PERCENT";
  totalAmount: string;
  durationMonths: number;
  renewalPlanId: Types.ObjectId | null;
  renewalPlanTitle: string | null;
  renewalPlanPrice: string | null;
  couponId: Types.ObjectId | null;
  couponCode: string | null;
  couponValid: boolean | null;
  couponDiscountType: "PERCENT" | "FIXED" | null;
  couponMessage: string | null;
  couponDiscountAmount: string;
  automaticDiscountAmount: string;
};

export class CommerceService {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async quote(userId: string, query: CheckoutQuoteQuery) {
    const pricing = await this.calculateCheckout(userId, query);
    return this.quoteDto(pricing);
  }

  async validateCoupon(userId: string, input: CouponValidateInput) {
    const pricing = await this.calculateCheckout(
      userId,
      { ...input, couponCode: input.code },
      undefined,
      true,
    );
    return {
      valid: pricing.couponValid === true,
      code: normalizeCouponCode(input.code),
      discountType: pricing.couponDiscountType,
      potentialDiscountAmount: pricing.couponDiscountAmount,
      automaticDiscountAmount: pricing.automaticDiscountAmount,
      discountAmount: pricing.discountAmount,
      discountSource: pricing.discountSource,
      totalAmount: pricing.totalAmount,
      currency: "VND" as const,
      message: pricing.couponMessage,
    };
  }

  async listRenewalPlans(userId: string, courseIdRaw: string) {
    const userObjectId = new Types.ObjectId(userId);
    const courseId = new Types.ObjectId(courseIdRaw);
    const course = await Course.findOne({
      _id: courseId,
      status: "PUBLISHED",
      deletedAt: null,
    })
      .select("title")
      .lean();
    if (!course) throw notFound("Published course not found.");
    const enrollment = await Enrollment.findOne({
      userId: userObjectId,
      courseId,
    }).lean();
    if (!enrollment)
      throw new AppError(
        403,
        "RENEWAL_ENROLLMENT_REQUIRED",
        "An existing course enrollment is required to view renewal plans.",
      );
    if (enrollment.status !== "ACTIVE")
      throw new AppError(
        403,
        "ENROLLMENT_REVOKED",
        "A revoked enrollment cannot be renewed.",
      );
    const plans = await RenewalPlan.find({ courseId, status: "ACTIVE" })
      .sort({ sortOrder: 1, _id: 1 })
      .lean();
    return {
      course: {
        id: course._id.toString(),
        title: course.title,
        enrollmentExpiresAt: enrollment.expiresAt.toISOString(),
      },
      items: plans.map((plan) => ({
        id: plan._id.toString(),
        courseId: plan.courseId.toString(),
        title: plan.title,
        durationMonths: plan.durationMonths,
        price: amountAsVnd(plan.price),
        currency: "VND" as const,
      })),
    };
  }

  async createOrder(
    userId: string,
    input: OrderCreateInput,
    idempotencyKey?: string,
  ): Promise<{
    detail: Awaited<ReturnType<CommerceService["getOwnedOrder"]>>;
    replayed: boolean;
  }> {
    const userObjectId = new Types.ObjectId(userId);
    const fingerprint = requestFingerprint(input);

    if (idempotencyKey) {
      const existing = await Order.findOne({
        userId: userObjectId,
        idempotencyKey,
      })
        .select("+requestFingerprint")
        .lean();
      if (existing) {
        assertSameFingerprint(existing.requestFingerprint, fingerprint);
        return {
          detail: await this.getOwnedOrder(userId, existing._id.toString()),
          replayed: true,
        };
      }
    }

    let orderId: Types.ObjectId;
    try {
      orderId = await withTransaction(async (session) => {
        if (idempotencyKey) {
          const existing = await Order.findOne({
            userId: userObjectId,
            idempotencyKey,
          })
            .select("+requestFingerprint")
            .session(session)
            .lean();
          if (existing) {
            assertSameFingerprint(existing.requestFingerprint, fingerprint);
            return existing._id;
          }
        }

        const pricing = await this.calculateCheckout(userId, input, session);

        const settings = await SiteSettings.findById("site")
          .select("+payment")
          .session(session)
          .lean();
        if (!toPaymentInstructions(settings?.payment))
          throw PAYMENT_CONFIGURATION_UNAVAILABLE();

        if (pricing.totalAmount === "0")
          throw new AppError(
            422,
            "ZERO_TOTAL_UNSUPPORTED",
            "A zero-total order cannot grant access until a free-enrollment policy is configured.",
          );
        if (pricing.discountSource === "COUPON" && pricing.couponId)
          await this.reserveCoupon(pricing.couponId, session);

        const amount = mongoose.Types.Decimal128.fromString(pricing.baseAmount);
        const discount = mongoose.Types.Decimal128.fromString(
          pricing.discountAmount,
        );
        const total = mongoose.Types.Decimal128.fromString(pricing.totalAmount);
        const [created] = await Order.create(
          [
            {
              orderCode: createOrderCode(this.now()),
              userId: userObjectId,
              courseId: new Types.ObjectId(pricing.courseId),
              orderType: input.orderType,
              renewalPlanId: pricing.renewalPlanId,
              renewalPlanTitleSnapshot: pricing.renewalPlanTitle,
              renewalPlanPriceSnapshot:
                pricing.renewalPlanPrice === null
                  ? null
                  : mongoose.Types.Decimal128.fromString(
                      pricing.renewalPlanPrice,
                    ),
              durationMonthsSnapshot: pricing.durationMonths,
              courseTitleSnapshot: pricing.courseTitle,
              coursePriceSnapshot: mongoose.Types.Decimal128.fromString(
                pricing.coursePrice,
              ),
              baseAmount: amount,
              discountAmount: discount,
              discountSource: pricing.discountSource,
              totalAmount: total,
              couponId:
                pricing.discountSource === "COUPON" ? pricing.couponId : null,
              status: "PENDING",
              paymentSubmittedAt: null,
              reviewedById: null,
              reviewedAt: null,
              reviewNote: null,
              ...(idempotencyKey
                ? { idempotencyKey, requestFingerprint: fingerprint }
                : {}),
              paidAt: null,
              expiresAt: null,
            } satisfies Partial<OrderFields>,
          ],
          { session },
        );
        if (!created) throw new Error("Order creation returned no document.");
        if (pricing.discountSource === "COUPON" && pricing.couponId)
          await CouponRedemption.create(
            [
              {
                couponId: pricing.couponId,
                userId: userObjectId,
                orderId: created._id,
                discountAmount: discount,
                status: "RESERVED",
                reservedAt: this.now(),
              },
            ],
            { session },
          );
        return created._id;
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        if (idempotencyKey) {
          const existing = await Order.findOne({
            userId: userObjectId,
            idempotencyKey,
          })
            .select("+requestFingerprint")
            .lean();
          if (existing) {
            assertSameFingerprint(existing.requestFingerprint, fingerprint);
            return {
              detail: await this.getOwnedOrder(userId, existing._id.toString()),
              replayed: true,
            };
          }
        }
        if (hasIndex(error, "uq_orders_one_pending_purchase"))
          throw new AppError(
            409,
            "PENDING_PURCHASE_EXISTS",
            "A pending purchase order already exists for this course.",
          );
        if (hasIndex(error, "uq_orders_one_pending_renewal"))
          throw new AppError(
            409,
            "PENDING_RENEWAL_EXISTS",
            "A pending renewal order already exists for this course.",
          );
        throw conflict();
      }
      throw error;
    }
    return {
      detail: await this.getOwnedOrder(userId, orderId.toString()),
      replayed: false,
    };
  }

  async listOwnedOrders(
    userId: string,
    query: PageQuery,
  ): Promise<Page<unknown>> {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
    if (query.status) filter.status = query.status;
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .lean(),
      Order.countDocuments(filter),
    ]);
    return pageResult(
      orders.map((order) => orderDto(order)),
      query,
      total,
    );
  }

  async getOwnedOrder(userId: string, orderId: string) {
    const order = await Order.findOne({
      _id: new Types.ObjectId(orderId),
      userId: new Types.ObjectId(userId),
    }).lean();
    if (!order) throw notFound("Order not found.");

    const settings = await SiteSettings.findById("site")
      .select("+payment")
      .lean();
    const paymentInstructions =
      order.status === "PENDING"
        ? toPaymentInstructions(settings?.payment)
        : null;
    const enrollment =
      order.status === "PAID"
        ? await Enrollment.findOne({
            userId: order.userId,
            courseId: order.courseId,
          }).lean()
        : null;
    return {
      order: orderDto(order),
      paymentInstructions,
      ...(enrollment
        ? { enrollment: enrollmentDto(enrollment, order.courseTitleSnapshot) }
        : {}),
    };
  }

  async confirmTransfer(userId: string, orderId: string) {
    const userObjectId = new Types.ObjectId(userId);
    const orderObjectId = new Types.ObjectId(orderId);
    let submittedOrderId: Types.ObjectId;
    try {
      submittedOrderId = await withTransaction(async (session) => {
        const order = await Order.findOne({
          _id: orderObjectId,
          userId: userObjectId,
        })
          .session(session)
          .lean();
        if (!order) throw notFound("Order not found.");
        if (order.status !== "PENDING")
          throw new AppError(
            409,
            "ORDER_NOT_PENDING",
            "Only pending orders can report a bank transfer.",
          );
        if (order.paymentSubmittedAt) return order._id;

        const user = await User.findById(userObjectId)
          .select("fullName email")
          .session(session)
          .lean();
        if (!user) throw notFound("Student account not found.");
        const submittedAt = this.now();
        const update = await Order.updateOne(
          {
            _id: order._id,
            userId: userObjectId,
            status: "PENDING",
            paymentSubmittedAt: null,
          },
          { $set: { paymentSubmittedAt: submittedAt } },
          { session },
        );
        if (update.modifiedCount !== 1) {
          const current = await Order.findOne({
            _id: order._id,
            userId: userObjectId,
          })
            .session(session)
            .lean();
          if (current?.status === "PENDING" && current.paymentSubmittedAt)
            return current._id;
          throw new AppError(
            409,
            "ORDER_NOT_PENDING",
            "Order state changed before transfer submission.",
          );
        }

        await EmailLog.create(
          [
            {
              userId: null,
              recipientType: "ADMIN",
              recipientEmail: null,
              templateType: "TRANSFER_SUBMITTED_ADMIN",
              subject: `Bank transfer reported: ${order.orderCode}`,
              templateData: {
                orderCode: order.orderCode,
                studentName: user.fullName,
                studentEmail: user.email,
                courseTitle: order.courseTitleSnapshot,
                amount: amountAsVnd(order.totalAmount),
                submittedAt: submittedAt.toISOString(),
              },
              status: "PENDING",
              dedupeKey: `${order._id.toString()}:TRANSFER_SUBMITTED_ADMIN`,
              attempts: 0,
              providerMessageId: null,
              sentAt: null,
              errorMessage: null,
              availableAt: submittedAt,
              leaseExpiresAt: null,
              leaseToken: null,
              lastErrorCode: null,
            },
          ],
          { session },
        );
        return order._id;
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        const existing = await Order.findOne({
          _id: orderObjectId,
          userId: userObjectId,
          status: "PENDING",
          paymentSubmittedAt: { $ne: null },
        }).lean();
        if (existing)
          return this.getOwnedOrder(userId, existing._id.toString());
      }
      throw error;
    }
    return this.getOwnedOrder(userId, submittedOrderId.toString());
  }

  async cancelStudentOrder(userId: string, orderId: string) {
    const userObjectId = new Types.ObjectId(userId);
    const orderObjectId = new Types.ObjectId(orderId);
    await withTransaction(async (session) => {
      const order = await Order.findOne({
        _id: orderObjectId,
        userId: userObjectId,
      })
        .session(session)
        .lean();
      if (!order) throw notFound("Order not found.");
      if (order.status === "CANCELLED") return;
      if (order.status !== "PENDING")
        throw new AppError(
          409,
          "ORDER_NOT_CANCELLABLE",
          "Only pending orders can be cancelled.",
        );
      if (order.paymentSubmittedAt)
        throw new AppError(
          409,
          "TRANSFER_ALREADY_SUBMITTED",
          "An order cannot be cancelled after a transfer is reported.",
        );
      const now = this.now();
      const update = await Order.updateOne(
        {
          _id: order._id,
          userId: userObjectId,
          status: "PENDING",
          paymentSubmittedAt: null,
        },
        {
          $set: {
            status: "CANCELLED",
            cancelledAt: now,
            cancelledById: userObjectId,
            cancellationActorType: "STUDENT",
            cancellationReason: "STUDENT_CANCELLED_BEFORE_TRANSFER",
            reconciliationOutcome: null,
          },
        },
        { session },
      );
      if (update.modifiedCount !== 1)
        throw new AppError(
          409,
          "ORDER_STATE_CHANGED",
          "Order changed before cancellation.",
        );
      await this.releaseCouponReservation(
        order as OrderFields & { _id: Types.ObjectId },
        session,
        now,
      );
      await AuditLog.create(
        [
          {
            actorUserId: userObjectId,
            action: "ORDER_CANCELLED_BY_STUDENT",
            entityType: "ORDER",
            entityId: order._id,
            oldValue: { status: "PENDING", paymentSubmittedAt: null },
            newValue: { status: "CANCELLED", cancelledAt: now.toISOString() },
            ipAddress: null,
          },
        ],
        { session },
      );
    });
    return this.getOwnedOrder(userId, orderObjectId.toString());
  }

  async cancelAdminOrder(
    adminId: string,
    orderId: string,
    input: {
      reason: string;
      reconciliationOutcome:
        "NO_FUNDS_RECEIVED" | "REFUND_CONFIRMED_EXTERNALLY";
    },
    ipAddress: string | null,
  ) {
    const adminObjectId = new Types.ObjectId(adminId);
    const orderObjectId = new Types.ObjectId(orderId);
    await withTransaction(async (session) => {
      const order = await Order.findById(orderObjectId).session(session).lean();
      if (!order) throw notFound("Order not found.");
      if (order.status === "CANCELLED") return;
      if (order.status !== "PENDING")
        throw new AppError(
          409,
          "ORDER_NOT_CANCELLABLE",
          "Only pending orders may be cancelled; paid orders cannot be cancelled.",
        );
      const now = this.now();
      const update = await Order.updateOne(
        { _id: order._id, status: "PENDING" },
        {
          $set: {
            status: "CANCELLED",
            cancelledAt: now,
            cancelledById: adminObjectId,
            cancellationActorType: "ADMIN",
            cancellationReason: input.reason,
            reconciliationOutcome: input.reconciliationOutcome,
          },
        },
        { session },
      );
      if (update.modifiedCount !== 1)
        throw new AppError(
          409,
          "ORDER_STATE_CHANGED",
          "Order changed before cancellation.",
        );
      await this.releaseCouponReservation(
        order as OrderFields & { _id: Types.ObjectId },
        session,
        now,
      );
      await AuditLog.create(
        [
          {
            actorUserId: adminObjectId,
            action: "ORDER_CANCELLED_BY_ADMIN",
            entityType: "ORDER",
            entityId: order._id,
            oldValue: {
              status: "PENDING",
              paymentSubmittedAt: toIso(order.paymentSubmittedAt),
            },
            newValue: {
              status: "CANCELLED",
              cancelledAt: now.toISOString(),
              reason: input.reason,
              reconciliationOutcome: input.reconciliationOutcome,
            },
            ipAddress,
          },
        ],
        { session },
      );
      const user = await User.findById(order.userId)
        .select("email")
        .session(session)
        .lean();
      if (user)
        await queueStudentEmail(
          session,
          order.userId,
          user.email,
          "ORDER_CANCELLED_STUDENT",
          `Order cancelled: ${order.orderCode}`,
          {
            orderCode: order.orderCode,
            courseTitle: order.courseTitleSnapshot,
            reason: input.reason,
            reconciliationOutcome: input.reconciliationOutcome,
          },
          `${order._id.toString()}:ORDER_CANCELLED_STUDENT`,
          now,
        );
    });
    return this.getAdminOrder(orderObjectId.toString());
  }

  async listAdminOrders(query: AdminOrderQuery): Promise<Page<unknown>> {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.paymentSubmitted !== undefined)
      filter.paymentSubmittedAt = query.paymentSubmitted ? { $ne: null } : null;
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ status: 1, paymentSubmittedAt: 1, createdAt: 1, _id: 1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .lean(),
      Order.countDocuments(filter),
    ]);
    const context = await this.adminOrderContext(orders);
    return pageResult(context, query, total);
  }

  async getAdminOrder(orderId: string) {
    const order = await Order.findById(new Types.ObjectId(orderId)).lean();
    if (!order) throw notFound("Order not found.");
    return (await this.adminOrderContext([order]))[0];
  }

  private async adminOrderContext(
    orders: Array<OrderFields & { _id: Types.ObjectId }>,
  ) {
    if (!orders.length) return [];
    const userIds = orders.map((order) => order.userId as Types.ObjectId);
    const courseIds = orders.map((order) => order.courseId as Types.ObjectId);
    const [users, courses, enrollments] = await Promise.all([
      User.find({ _id: { $in: userIds } })
        .select("fullName email")
        .lean(),
      Course.find({ _id: { $in: courseIds } })
        .select("code title status deletedAt")
        .lean(),
      Enrollment.find({
        userId: { $in: userIds },
        courseId: { $in: courseIds },
      }).lean(),
    ]);
    const redemptions = await CouponRedemption.find({
      orderId: { $in: orders.map((order) => order._id) },
    }).lean();
    const coupons = await Coupon.find({
      _id: { $in: redemptions.map((row) => row.couponId) },
    })
      .select("code")
      .lean();
    const usersById = new Map(users.map((user) => [user._id.toString(), user]));
    const coursesById = new Map(
      courses.map((course) => [course._id.toString(), course]),
    );
    const enrollmentsByKey = new Map(
      enrollments.map((enrollment) => [
        `${enrollment.userId}:${enrollment.courseId}`,
        enrollment,
      ]),
    );
    const couponsById = new Map(
      coupons.map((coupon) => [coupon._id.toString(), coupon.code]),
    );
    const redemptionByOrder = new Map(
      redemptions.map((row) => [row.orderId.toString(), row]),
    );
    return orders.map((order) => {
      const user = usersById.get(order.userId.toString());
      const course = coursesById.get(order.courseId.toString());
      const enrollment = enrollmentsByKey.get(
        `${order.userId}:${order.courseId}`,
      );
      const redemption = redemptionByOrder.get(order._id.toString());
      return {
        order: orderDto(order, true),
        student: user
          ? {
              id: user._id.toString(),
              fullName: user.fullName,
              email: user.email,
            }
          : null,
        course: course
          ? {
              id: course._id.toString(),
              code: course.code,
              title: course.title,
              status: course.status,
              deleted: course.deletedAt !== null,
            }
          : {
              id: order.courseId.toString(),
              code: null,
              title: order.courseTitleSnapshot,
              status: "MISSING",
              deleted: true,
            },
        existingEnrollment: enrollment
          ? {
              id: enrollment._id.toString(),
              status: enrollment.status,
              activatedAt: toIso(enrollment.activatedAt),
              expiresAt: toIso(enrollment.expiresAt),
            }
          : null,
        couponReservation: redemption
          ? {
              code: couponsById.get(redemption.couponId.toString()) ?? null,
              status: redemption.status,
              discountAmount: amountAsVnd(redemption.discountAmount),
              reservedAt: toIso(redemption.reservedAt),
              redeemedAt: toIso(redemption.redeemedAt),
              releasedAt: toIso(redemption.releasedAt),
            }
          : null,
      };
    });
  }

  async approveOrder(
    adminId: string,
    orderId: string,
    reviewNote: string | undefined,
    ipAddress: string | null,
  ) {
    const adminObjectId = new Types.ObjectId(adminId);
    const orderObjectId = new Types.ObjectId(orderId);
    const now = this.now();
    let result: { orderId: Types.ObjectId; enrollmentId: Types.ObjectId };
    try {
      result = await withTransaction(async (session) => {
        const order = await Order.findById(orderObjectId)
          .session(session)
          .lean();
        if (!order) throw notFound("Order not found.");
        if (order.status !== "PENDING")
          throw new AppError(
            409,
            "ORDER_ALREADY_REVIEWED",
            "Only pending orders can be approved.",
          );
        if (!order.paymentSubmittedAt)
          throw new AppError(
            409,
            "TRANSFER_NOT_SUBMITTED",
            "Student must report the bank transfer before approval.",
          );

        const existingEnrollment = await Enrollment.findOne({
          userId: order.userId,
          courseId: order.courseId,
        })
          .session(session)
          .lean();
        if (order.orderType === "PURCHASE" && existingEnrollment)
          throw new AppError(
            409,
            "ENROLLMENT_ALREADY_EXISTS",
            "An enrollment already exists; approval was not applied to avoid changing existing access or progress.",
          );
        if (order.orderType === "RENEWAL" && !existingEnrollment)
          throw new AppError(
            409,
            "RENEWAL_ENROLLMENT_REQUIRED",
            "The renewal enrollment no longer exists.",
          );
        if (
          order.orderType === "RENEWAL" &&
          existingEnrollment?.status !== "ACTIVE"
        )
          throw new AppError(
            409,
            "ENROLLMENT_REVOKED",
            "A revoked enrollment cannot be renewed.",
          );

        const user = await User.findById(order.userId)
          .select("fullName email role")
          .session(session)
          .lean();
        if (!user || user.role !== "STUDENT")
          throw new AppError(
            409,
            "STUDENT_UNAVAILABLE",
            "The order owner is not an available student account.",
          );

        const renewalBase =
          order.orderType === "RENEWAL" && existingEnrollment
            ? existingEnrollment.expiresAt > now
              ? existingEnrollment.expiresAt
              : now
            : now;
        const expiresAt = addUtcCalendarMonths(
          renewalBase,
          order.durationMonthsSnapshot,
        );
        const update: Record<string, unknown> = {
          status: "PAID",
          paidAt: now,
          reviewedById: adminObjectId,
          reviewedAt: now,
        };
        if (reviewNote !== undefined) update.reviewNote = reviewNote;
        const cas = await Order.updateOne(
          {
            _id: order._id,
            status: "PENDING",
            paymentSubmittedAt: { $ne: null },
          },
          { $set: update },
          { session },
        );
        if (cas.modifiedCount !== 1)
          throw new AppError(
            409,
            "ORDER_ALREADY_REVIEWED",
            "Order state changed before approval.",
          );

        let enrollmentId: Types.ObjectId;
        if (order.orderType === "PURCHASE") {
          const [enrollment] = await Enrollment.create(
            [
              {
                userId: order.userId,
                courseId: order.courseId,
                sourceOrderId: order._id,
                activatedAt: now,
                expiresAt,
                status: "ACTIVE",
              },
            ],
            { session },
          );
          if (!enrollment)
            throw new Error("Enrollment grant returned no document.");
          enrollmentId = enrollment._id;
        } else {
          const enrollment = existingEnrollment!;
          const enrollmentCas = await Enrollment.updateOne(
            {
              _id: enrollment._id,
              status: "ACTIVE",
              expiresAt: enrollment.expiresAt,
            },
            { $set: { expiresAt } },
            { session },
          );
          if (enrollmentCas.modifiedCount !== 1)
            throw new AppError(
              409,
              "ENROLLMENT_CHANGED",
              "Enrollment changed before renewal approval.",
            );
          enrollmentId = enrollment._id;
        }
        await EnrollmentAdjustment.create(
          [
            {
              enrollmentId,
              adjustmentType:
                order.orderType === "PURCHASE" ? "GRANT" : "RENEW",
              previousExpiresAt:
                order.orderType === "PURCHASE"
                  ? null
                  : existingEnrollment!.expiresAt,
              newExpiresAt: expiresAt,
              durationMonths: order.durationMonthsSnapshot,
              orderId: order._id,
              performedById: adminObjectId,
              reason:
                order.orderType === "PURCHASE"
                  ? "PURCHASE_APPROVED"
                  : "RENEWAL_APPROVED",
            },
          ],
          { session },
        );
        await this.finalizeCouponReservation(order, session, now);
        await AuditLog.create(
          [
            {
              actorUserId: adminObjectId,
              action:
                order.orderType === "PURCHASE"
                  ? "ORDER_APPROVED"
                  : "RENEWAL_APPROVED",
              entityType: "ORDER",
              entityId: order._id,
              oldValue: {
                status: "PENDING",
                paymentSubmittedAt: order.paymentSubmittedAt.toISOString(),
              },
              newValue: {
                status: "PAID",
                orderCode: order.orderCode,
                totalAmount: amountAsVnd(order.totalAmount),
                reviewedAt: now.toISOString(),
                enrollmentId: enrollmentId.toString(),
                orderType: order.orderType,
                previousExpiresAt:
                  existingEnrollment?.expiresAt.toISOString() ?? null,
                expiresAt: expiresAt.toISOString(),
              },
              ipAddress,
            } satisfies Partial<AuditLogFields>,
          ],
          { session },
        );
        const templateType =
          order.orderType === "PURCHASE"
            ? "ORDER_APPROVED_STUDENT"
            : "RENEWAL_APPROVED_STUDENT";
        await queueStudentEmail(
          session,
          order.userId,
          user.email,
          templateType,
          `${order.orderType === "PURCHASE" ? "Course access approved" : "Course renewal approved"}: ${order.courseTitleSnapshot}`,
          {
            courseTitle: order.courseTitleSnapshot,
            orderCode: order.orderCode,
            durationMonths: order.durationMonthsSnapshot,
            expiresAt: expiresAt.toISOString(),
            learningUrl: `/student/courses/${order.courseId.toString()}`,
          },
          `${order._id.toString()}:${templateType}`,
          now,
        );
        return { orderId: order._id, enrollmentId };
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        const order = await Order.findById(orderObjectId).lean();
        if (order?.status === "PAID")
          throw new AppError(
            409,
            "ORDER_ALREADY_REVIEWED",
            "This order has already been approved.",
          );
        if (hasIndex(error, "uq_enrollments_user_course"))
          throw new AppError(
            409,
            "ENROLLMENT_ALREADY_EXISTS",
            "An enrollment already exists for this course.",
          );
        if (hasIndex(error, "uq_enrollment_adjustments_order_type"))
          throw new AppError(
            409,
            "ORDER_ALREADY_REVIEWED",
            "This order adjustment has already been applied.",
          );
      }
      throw error;
    }

    const approvedOrder = await Order.findById(result.orderId).lean();
    const enrollment = await Enrollment.findById(result.enrollmentId).lean();
    if (!approvedOrder || !enrollment)
      throw new Error("Committed order grant could not be reloaded.");
    return {
      order: orderDto(approvedOrder, true),
      enrollment: enrollmentDto(enrollment, approvedOrder.courseTitleSnapshot),
    };
  }

  private async finalizeCouponReservation(
    order: OrderFields & { _id: Types.ObjectId },
    session: mongoose.ClientSession,
    now: Date,
  ) {
    if (!order.couponId) return;
    const redemption = await CouponRedemption.findOne({
      orderId: order._id,
    }).session(session);
    if (!redemption)
      throw new AppError(
        409,
        "COUPON_REDEMPTION_MISSING",
        "The reserved coupon record is missing.",
      );
    if (redemption.status === "REDEEMED") return;
    if (redemption.status !== "RESERVED")
      throw new AppError(
        409,
        "COUPON_RESERVATION_RELEASED",
        "The coupon reservation was already released.",
      );
    const transition = await CouponRedemption.updateOne(
      { _id: redemption._id, status: "RESERVED" },
      { $set: { status: "REDEEMED", redeemedAt: now } },
      { session },
    );
    if (transition.modifiedCount !== 1)
      throw new AppError(
        409,
        "COUPON_REDEMPTION_CONFLICT",
        "Coupon reservation changed before approval.",
      );
    const coupon = await Coupon.updateOne(
      { _id: order.couponId, reservedCount: { $gt: 0 } },
      { $inc: { reservedCount: -1, redemptionCount: 1 } },
      { session },
    );
    if (coupon.modifiedCount !== 1)
      throw new AppError(
        409,
        "COUPON_COUNTER_CONFLICT",
        "Coupon reservation counters are inconsistent.",
      );
  }

  private async releaseCouponReservation(
    order: OrderFields & { _id: Types.ObjectId },
    session: mongoose.ClientSession,
    now: Date,
  ) {
    if (!order.couponId) return;
    const redemption = await CouponRedemption.findOne({
      orderId: order._id,
    }).session(session);
    if (!redemption)
      throw new AppError(
        409,
        "COUPON_REDEMPTION_MISSING",
        "The reserved coupon record is missing.",
      );
    if (redemption.status === "RELEASED") return;
    if (redemption.status !== "RESERVED")
      throw new AppError(
        409,
        "COUPON_ALREADY_REDEEMED",
        "A redeemed coupon reservation cannot be released.",
      );
    const transition = await CouponRedemption.updateOne(
      { _id: redemption._id, status: "RESERVED" },
      { $set: { status: "RELEASED", releasedAt: now } },
      { session },
    );
    if (transition.modifiedCount !== 1)
      throw new AppError(
        409,
        "COUPON_REDEMPTION_CONFLICT",
        "Coupon reservation changed before cancellation.",
      );
    const coupon = await Coupon.updateOne(
      { _id: order.couponId, reservedCount: { $gt: 0 } },
      { $inc: { reservedCount: -1 } },
      { session },
    );
    if (coupon.modifiedCount !== 1)
      throw new AppError(
        409,
        "COUPON_COUNTER_CONFLICT",
        "Coupon reservation counters are inconsistent.",
      );
  }

  async getAdminSiteSettings() {
    const settings = await SiteSettings.findById("site")
      .select("+payment")
      .lean();
    if (!settings) throw notFound("Site settings are not configured.");
    return siteSettingsDto(settings);
  }

  async patchAdminSiteSettings(
    adminId: string,
    patch: SiteSettingsPatch,
    ipAddress: string | null,
  ) {
    const adminObjectId = new Types.ObjectId(adminId);
    const updatedAt = this.now();
    return withTransaction(async (session) => {
      for (const field of ["logoAssetId", "heroAssetId"] as const) {
        const assetId = patch[field];
        if (!assetId) continue;
        const locked = await MediaAsset.updateOne(
          {
            _id: new Types.ObjectId(assetId),
            mediaType: "IMAGE",
            uploadStatus: "READY",
            deletedAt: null,
          },
          { $inc: { referenceRevision: 1 } },
          { session },
        );
        if (locked.modifiedCount !== 1)
          throw new AppError(
            422,
            "INVALID_MEDIA_ASSOCIATION",
            `${field} must reference a ready image asset.`,
          );
      }
      let settings = await SiteSettings.findById("site")
        .select("+payment")
        .session(session);
      const oldSnapshot = settings
        ? safeSettingsAudit(settings.toObject())
        : null;
      if (!settings) {
        settings = new SiteSettings({
          _id: "site",
          siteName: "PAniverseDeutsch",
          heroTitle: "",
          heroDescription: "",
          footerDescription: "",
          updatedAt,
        });
      }

      const changedFields = Object.keys(patch);
      for (const [key, value] of Object.entries(patch)) {
        if (key === "payment" || value === undefined) continue;
        settings.set(key, value);
      }
      if (Object.hasOwn(patch, "payment")) {
        if (patch.payment === null) {
          settings.set("payment", null);
        } else if (patch.payment) {
          const current = settings.get("payment");
          const previous = isRecord(current) ? current : {};
          const merged = {
            ...emptyPaymentSettings(),
            ...previous,
            ...patch.payment,
          };
          if (merged.enabled && !toPaymentInstructions(merged))
            throw new AppError(
              400,
              "INVALID_PAYMENT_CONFIGURATION",
              "Enabling bank transfer requires bank name, account number, account holder, HTTPS QR reference and instructions.",
            );
          settings.set("payment", merged);
        }
      }
      settings.set("updatedAt", updatedAt);
      await settings.save({ session });
      const sanitized = safeSettingsAudit(settings.toObject());
      await AuditLog.create(
        [
          {
            actorUserId: adminObjectId,
            action: "SITE_SETTINGS_UPDATED",
            entityType: "SITE_SETTINGS",
            entityId: "site",
            oldValue: oldSnapshot,
            newValue: { changedFields, ...sanitized },
            ipAddress,
          },
        ],
        { session },
      );
      return siteSettingsDto(settings.toObject());
    });
  }

  private async calculateCheckout(
    userId: string,
    input: CheckoutInput,
    session?: mongoose.ClientSession,
    allowInvalidCoupon = false,
  ): Promise<CheckoutPricing> {
    const userObjectId = new Types.ObjectId(userId);
    const courseId = new Types.ObjectId(input.courseId);
    const courseQuery = Course.findOne({
      _id: courseId,
      status: "PUBLISHED",
      deletedAt: null,
    }).select("title price accessDurationMonths");
    const course = await (
      session ? courseQuery.session(session) : courseQuery
    ).lean();
    if (!course) throw notFound("Published course not found.");
    const coursePrice = amountAsVnd(course.price);
    let baseAmount: string;
    let durationMonths: number;
    let renewalPlanId: Types.ObjectId | null = null;
    let renewalPlanTitle: string | null = null;
    let renewalPlanPrice: string | null = null;

    if (input.orderType === "PURCHASE") {
      if (coursePrice === "0")
        throw new AppError(
          422,
          "ZERO_PRICE_UNSUPPORTED",
          "Zero-price courses cannot be purchased until a free-enrollment policy is configured.",
        );
      if (
        !Number.isInteger(course.accessDurationMonths) ||
        course.accessDurationMonths < 1
      )
        throw new AppError(
          409,
          "COURSE_NOT_PURCHASABLE",
          "Course access duration is invalid.",
        );
      const enrollmentQuery = Enrollment.findOne({
        userId: userObjectId,
        courseId,
      });
      const enrollment = await (
        session ? enrollmentQuery.session(session) : enrollmentQuery
      ).lean();
      if (enrollment)
        throw new AppError(
          409,
          "PURCHASE_ALREADY_ENROLLED",
          "An enrollment already exists for this course. Use the renewal or support flow.",
        );
      const pendingQuery = Order.findOne({
        userId: userObjectId,
        courseId,
        orderType: "PURCHASE",
        status: "PENDING",
      });
      const pending = await (
        session ? pendingQuery.session(session) : pendingQuery
      ).lean();
      if (pending)
        throw new AppError(
          409,
          "PENDING_PURCHASE_EXISTS",
          "A pending purchase order already exists for this course.",
        );
      baseAmount = coursePrice;
      durationMonths = course.accessDurationMonths;
    } else {
      if (!input.renewalPlanId)
        throw new AppError(
          400,
          "RENEWAL_PLAN_REQUIRED",
          "A renewal plan is required.",
        );
      const enrollmentQuery = Enrollment.findOne({
        userId: userObjectId,
        courseId,
      });
      const enrollment = await (
        session ? enrollmentQuery.session(session) : enrollmentQuery
      ).lean();
      if (!enrollment)
        throw new AppError(
          409,
          "RENEWAL_ENROLLMENT_REQUIRED",
          "An existing enrollment is required to renew this course.",
        );
      if (enrollment.status !== "ACTIVE")
        throw new AppError(
          409,
          "ENROLLMENT_REVOKED",
          "A revoked enrollment cannot be renewed.",
        );
      renewalPlanId = new Types.ObjectId(input.renewalPlanId);
      const planQuery = RenewalPlan.findOne({
        _id: renewalPlanId,
        courseId,
        status: "ACTIVE",
      });
      const plan = await (
        session ? planQuery.session(session) : planQuery
      ).lean();
      if (!plan)
        throw new AppError(
          422,
          "RENEWAL_PLAN_UNAVAILABLE",
          "The selected renewal plan is unavailable for this course.",
        );
      baseAmount = amountAsVnd(plan.price);
      if (
        baseAmount === "0" ||
        !Number.isInteger(plan.durationMonths) ||
        plan.durationMonths < 1
      )
        throw new AppError(
          409,
          "RENEWAL_PLAN_INVALID",
          "Renewal plan pricing or duration is invalid.",
        );
      durationMonths = plan.durationMonths;
      renewalPlanTitle = plan.title;
      renewalPlanPrice = baseAmount;
      const pendingQuery = Order.findOne({
        userId: userObjectId,
        courseId,
        orderType: "RENEWAL",
        status: "PENDING",
      });
      const pending = await (
        session ? pendingQuery.session(session) : pendingQuery
      ).lean();
      if (pending)
        throw new AppError(
          409,
          "PENDING_RENEWAL_EXISTS",
          "A pending renewal order already exists for this course.",
        );
    }

    const now = this.now();
    const priorPaidQuery = Order.countDocuments({
      userId: userObjectId,
      orderType: "PURCHASE",
      status: "PAID",
    });
    const priorPaidPurchases =
      input.orderType === "PURCHASE"
        ? await (session ? priorPaidQuery.session(session) : priorPaidQuery)
        : 0;
    const automaticDiscountAmount =
      priorPaidPurchases > 0 ? calculateAutomaticFivePercent(baseAmount) : "0";
    let coupon: {
      _id: Types.ObjectId;
      status: "ACTIVE" | "INACTIVE";
      startsAt?: Date | null;
      expiresAt?: Date | null;
      usageLimit?: number | null;
      reservedCount?: number;
      redemptionCount?: number;
      discountType: "PERCENT" | "FIXED";
      discountValue: mongoose.Types.Decimal128;
      maxDiscount?: mongoose.Types.Decimal128 | null;
    } | null = null;
    let couponValid: boolean | null = null;
    let couponDiscountType: "PERCENT" | "FIXED" | null = null;
    let couponMessage: string | null = null;
    let couponDiscountAmount = "0";
    const couponCode = input.couponCode
      ? normalizeCouponCode(input.couponCode)
      : null;
    if (couponCode) {
      const couponQuery = Coupon.findOne({ code: couponCode });
      coupon = await (
        session ? couponQuery.session(session) : couponQuery
      ).lean();
      if (!coupon) {
        couponValid = false;
        couponMessage = "This coupon is unavailable.";
      } else if (
        coupon.status !== "ACTIVE" ||
        (coupon.startsAt && coupon.startsAt > now) ||
        (coupon.expiresAt && coupon.expiresAt <= now)
      ) {
        couponValid = false;
        couponMessage = "This coupon is unavailable.";
      } else if (
        coupon.usageLimit != null &&
        (coupon.reservedCount ?? 0) + (coupon.redemptionCount ?? 0) >=
          coupon.usageLimit
      ) {
        couponValid = false;
        couponMessage = "This coupon has no remaining uses.";
      } else {
        couponValid = true;
        couponDiscountType = coupon.discountType;
        couponDiscountAmount = calculateCouponDiscount(baseAmount, {
          discountType: coupon.discountType,
          discountValue: coupon.discountValue.toString(),
          maxDiscount: coupon.maxDiscount?.toString() ?? null,
        });
        couponMessage = "Coupon can be applied.";
      }
      if (!couponValid && !allowInvalidCoupon)
        throw new AppError(
          422,
          "COUPON_NOT_APPLICABLE",
          couponMessage ?? "This coupon is unavailable.",
        );
    }
    const selection = chooseDiscount(
      baseAmount,
      couponValid ? couponDiscountAmount : "0",
      automaticDiscountAmount,
    );
    return {
      courseId: courseId.toString(),
      orderType: input.orderType,
      courseTitle: course.title,
      coursePrice,
      baseAmount,
      discountAmount: selection.discountAmount,
      discountSource: selection.discountSource,
      totalAmount: selection.totalAmount,
      durationMonths,
      renewalPlanId,
      renewalPlanTitle,
      renewalPlanPrice,
      couponId:
        selection.discountSource === "COUPON" ? (coupon?._id ?? null) : null,
      couponCode,
      couponValid,
      couponDiscountType,
      couponMessage,
      couponDiscountAmount,
      automaticDiscountAmount,
    };
  }

  private quoteDto(pricing: CheckoutPricing) {
    return {
      courseId: pricing.courseId,
      orderType: pricing.orderType,
      courseTitle: pricing.courseTitle,
      coursePrice: pricing.coursePrice,
      renewalPlanId: pricing.renewalPlanId?.toString() ?? null,
      renewalPlanTitle: pricing.renewalPlanTitle,
      renewalPlanPrice: pricing.renewalPlanPrice,
      baseAmount: pricing.baseAmount,
      couponDiscountAmount: pricing.couponDiscountAmount,
      automaticDiscountAmount: pricing.automaticDiscountAmount,
      discountAmount: pricing.discountAmount,
      discountSource: pricing.discountSource,
      couponCode:
        pricing.discountSource === "COUPON" ? pricing.couponCode : null,
      totalAmount: pricing.totalAmount,
      currency: "VND" as const,
      durationMonths: pricing.durationMonths,
    };
  }

  private async reserveCoupon(
    couponId: Types.ObjectId,
    session: mongoose.ClientSession,
  ) {
    const now = this.now();
    const reserved = await Coupon.updateOne(
      {
        _id: couponId,
        status: "ACTIVE",
        $and: [
          { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
          { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
          {
            $or: [
              { usageLimit: null },
              {
                $expr: {
                  $lt: [
                    { $add: ["$reservedCount", "$redemptionCount"] },
                    "$usageLimit",
                  ],
                },
              },
            ],
          },
        ],
      },
      { $inc: { reservedCount: 1 } },
      { session },
    );
    if (reserved.modifiedCount !== 1)
      throw new AppError(
        409,
        "COUPON_CAPACITY_EXHAUSTED",
        "Coupon availability changed; request a new quote.",
      );
  }
}

function pageResult<T>(
  items: T[],
  query: Pick<PageQuery, "page" | "pageSize">,
  total: number,
): Page<T> {
  return {
    items,
    page: query.page,
    pageSize: query.pageSize,
    total,
    hasMore: query.page * query.pageSize < total,
  };
}

async function queueStudentEmail(
  session: mongoose.ClientSession,
  userId: Types.ObjectId,
  recipientEmail: string,
  templateType:
    | "ORDER_APPROVED_STUDENT"
    | "RENEWAL_APPROVED_STUDENT"
    | "ORDER_CANCELLED_STUDENT"
    | "ENROLLMENT_GRANTED_STUDENT"
    | "ENROLLMENT_REVOKED_STUDENT"
    | "ENROLLMENT_RESTORED_STUDENT"
    | "ENROLLMENT_EXTENDED_STUDENT",
  subject: string,
  templateData: Record<string, unknown>,
  dedupeKey: string,
  availableAt: Date,
) {
  await EmailLog.create(
    [
      {
        userId,
        recipientType: "STUDENT",
        recipientEmail,
        templateType,
        subject,
        templateData,
        status: "PENDING",
        dedupeKey,
        attempts: 0,
        providerMessageId: null,
        sentAt: null,
        errorMessage: null,
        availableAt,
        leaseExpiresAt: null,
        leaseToken: null,
        lastErrorCode: null,
      },
    ],
    { session },
  );
}

function requestFingerprint(input: OrderCreateInput): string {
  const normalized = {
    courseId: input.courseId.toLowerCase(),
    orderType: input.orderType,
    renewalPlanId: input.renewalPlanId?.toLowerCase() ?? null,
    couponCode: input.couponCode?.trim().toUpperCase() ?? null,
  };
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

function assertSameFingerprint(existing: unknown, fingerprint: string): void {
  if (existing !== fingerprint)
    throw new AppError(
      409,
      "IDEMPOTENCY_KEY_REUSED",
      "This Idempotency-Key was already used for a different request.",
    );
}

function createOrderCode(now: Date): string {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `PAN${date}${randomBytes(5).toString("hex").toUpperCase()}`;
}

function isDuplicateKeyError(error: unknown): error is {
  code: number;
  keyPattern?: Record<string, unknown>;
  message?: string;
} {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function hasIndex(error: { message?: string }, name: string): boolean {
  return error.message?.includes(name) ?? false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function emptyPaymentSettings() {
  return {
    enabled: false,
    bankName: null,
    accountNumber: null,
    accountHolderName: null,
    qrUrl: null,
    transferInstructions: null,
  };
}

function siteSettingsDto(value: object) {
  const settings = value as Record<string, unknown>;
  const payment = isRecord(settings.payment) ? settings.payment : null;
  return {
    siteName:
      typeof settings.siteName === "string"
        ? settings.siteName
        : "PAniverseDeutsch",
    logoAssetId: nullableObjectId(settings.logoAssetId),
    heroTitle: typeof settings.heroTitle === "string" ? settings.heroTitle : "",
    heroDescription:
      typeof settings.heroDescription === "string"
        ? settings.heroDescription
        : "",
    heroAssetId: nullableObjectId(settings.heroAssetId),
    contactEmail: nullableText(settings.contactEmail),
    contactPhone: nullableText(settings.contactPhone),
    facebookUrl: nullableText(settings.facebookUrl),
    zaloUrl: nullableText(settings.zaloUrl),
    footerDescription:
      typeof settings.footerDescription === "string"
        ? settings.footerDescription
        : "",
    payment: payment
      ? {
          enabled: payment.enabled === true,
          bankName:
            typeof payment.bankName === "string" ? payment.bankName : null,
          accountNumber:
            typeof payment.accountNumber === "string"
              ? payment.accountNumber
              : null,
          accountHolderName:
            typeof payment.accountHolderName === "string"
              ? payment.accountHolderName
              : null,
          qrUrl: typeof payment.qrUrl === "string" ? payment.qrUrl : null,
          transferInstructions:
            typeof payment.transferInstructions === "string"
              ? payment.transferInstructions
              : null,
        }
      : null,
    updatedAt:
      toIso(settings.updatedAt instanceof Date ? settings.updatedAt : null) ??
      new Date().toISOString(),
  };
}

function safeSettingsAudit(value: object) {
  const settings = value as Record<string, unknown>;
  const payment = isRecord(settings.payment) ? settings.payment : null;
  return {
    payment: payment
      ? {
          enabled: payment.enabled === true,
          configured: toPaymentInstructions(payment) !== null,
        }
      : null,
  };
}

function nullableObjectId(value: unknown): string | null {
  return value instanceof Types.ObjectId ? value.toString() : null;
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
