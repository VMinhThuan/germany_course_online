import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import type { EmailService, NotificationEmail } from "../auth/email-service.js";
import { EmailLog, User } from "../../db/models/index.js";

const MAX_ATTEMPTS = 5;
const LEASE_MS = 60_000;
const BASE_BACKOFF_MS = 30_000;
const MAX_BACKOFF_MS = 30 * 60_000;
const BATCH_LIMIT = 10;
export const EMAIL_OUTBOX_BATCH_LIMIT = BATCH_LIMIT;

type WorkerOptions = {
  now?: () => Date;
  frontendBaseUrl?: string;
  adminNotificationEmail?: string;
};

type OutboxJob = {
  _id: Types.ObjectId;
  userId?: { toString(): string } | null;
  recipientType: "ADMIN" | "STUDENT";
  recipientEmail?: string | null;
  templateType:
    | "TRANSFER_SUBMITTED_ADMIN"
    | "ORDER_REJECTED_STUDENT"
    | "ORDER_APPROVED_STUDENT"
    | "RENEWAL_APPROVED_STUDENT"
    | "ORDER_CANCELLED_STUDENT"
    | "ENROLLMENT_GRANTED_STUDENT"
    | "ENROLLMENT_REVOKED_STUDENT"
    | "ENROLLMENT_RESTORED_STUDENT"
    | "ENROLLMENT_EXTENDED_STUDENT";
  subject: string;
  templateData: unknown;
  attempts: number;
  leaseToken: string;
};

export class EmailOutboxWorker {
  private readonly now: () => Date;
  private readonly frontendBaseUrl: string;
  private readonly adminNotificationEmail: string | undefined;
  private activePoll: Promise<number> | undefined;

  constructor(
    private readonly emailService: EmailService,
    options: WorkerOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.frontendBaseUrl = (options.frontendBaseUrl ?? "").replace(/\/$/, "");
    this.adminNotificationEmail = options.adminNotificationEmail;
  }

  async runOnce(limit = BATCH_LIMIT): Promise<number> {
    if (!this.emailService.available) return 0;
    if (this.activePoll) return this.activePoll;
    const boundedLimit = Number.isFinite(limit)
      ? Math.min(BATCH_LIMIT, Math.max(1, Math.floor(limit)))
      : BATCH_LIMIT;
    this.activePoll = this.processBatch(boundedLimit);
    try {
      return await this.activePoll;
    } finally {
      this.activePoll = undefined;
    }
  }

  /** Process one known outbox row after its transaction has committed. */
  async processMessage(messageId: Types.ObjectId | string): Promise<boolean> {
    if (!this.emailService.available) return false;
    const id =
      typeof messageId === "string" ? new Types.ObjectId(messageId) : messageId;
    const job = await this.claim({ _id: id });
    if (!job) return false;
    await this.deliver(job);
    return true;
  }

  private async processBatch(limit: number): Promise<number> {
    let processed = 0;
    for (let index = 0; index < limit; index += 1) {
      const job = await this.claim();
      if (!job) break;
      await this.deliver(job);
      processed += 1;
    }
    return processed;
  }

  private async claim(
    filter: Record<string, unknown> = {},
  ): Promise<OutboxJob | null> {
    const now = this.now();
    return EmailLog.findOneAndUpdate(
      {
        ...filter,
        $or: [
          { status: "PENDING", availableAt: { $lte: now } },
          { status: "PROCESSING", leaseExpiresAt: { $lte: now } },
        ],
      },
      {
        $set: {
          status: "PROCESSING",
          leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
          leaseToken: randomUUID(),
          errorMessage: null,
        },
        $inc: { attempts: 1 },
      },
      { returnDocument: "after", sort: { availableAt: 1, createdAt: 1 } },
    )
      .select("+leaseToken")
      .lean() as Promise<OutboxJob | null>;
  }

  private async deliver(job: OutboxJob): Promise<void> {
    try {
      const notification = await this.buildNotification(job);
      const result = await this.emailService.sendNotification(notification);
      await EmailLog.updateOne(
        { _id: job._id, status: "PROCESSING", leaseToken: job.leaseToken },
        {
          $set: {
            status: "SENT",
            providerMessageId: result.messageId ?? null,
            sentAt: this.now(),
            errorMessage: null,
            lastErrorCode: null,
            leaseExpiresAt: null,
            leaseToken: null,
          },
        },
      );
    } catch (error) {
      const attempt = job.attempts;
      const terminal = attempt >= MAX_ATTEMPTS;
      const backoff = Math.min(
        BASE_BACKOFF_MS * 2 ** (attempt - 1),
        MAX_BACKOFF_MS,
      );
      await EmailLog.updateOne(
        { _id: job._id, status: "PROCESSING", leaseToken: job.leaseToken },
        {
          $set: {
            status: terminal ? "FAILED" : "PENDING",
            availableAt: new Date(this.now().getTime() + backoff),
            errorMessage: terminal
              ? "Notification delivery failed after the retry limit."
              : "Notification delivery failed; retry scheduled.",
            lastErrorCode:
              error instanceof MissingRecipientError
                ? error.code
                : "EMAIL_DELIVERY_FAILED",
            leaseExpiresAt: null,
            leaseToken: null,
          },
        },
      );
    }
  }

  private async buildNotification(job: OutboxJob): Promise<NotificationEmail> {
    const data = asRecord(job.templateData);
    if (job.templateType === "TRANSFER_SUBMITTED_ADMIN") {
      const admins = this.adminNotificationEmail
        ? []
        : await User.find({ role: "ADMIN", status: "ACTIVE" })
            .select("email")
            .lean();
      const recipients = this.adminNotificationEmail
        ? [this.adminNotificationEmail]
        : [...new Set(admins.map((admin) => admin.email).filter(Boolean))];
      if (!recipients.length) throw new MissingRecipientError();
      const reviewUrl = `${this.frontendBaseUrl}/admin/orders/${encodeURIComponent(requiredText(data.orderId))}`;
      return {
        to: recipients,
        subject: `[LMS] Giao dịch đang chờ xác nhận - ${requiredText(data.orderCode)}`,
        text: [
          "Có giao dịch chuyển khoản cần đối soát thủ công.",
          `Học viên: ${requiredText(data.studentName)} (${requiredText(data.studentEmail)})`,
          `Khóa học: ${requiredText(data.courseTitle)}`,
          `Mã đơn: ${requiredText(data.orderCode)}`,
          `Số tiền: ${requiredText(data.amount)} VND`,
          `Ngân hàng nhận: ${requiredText(data.bankName)}`,
          `Số tài khoản nhận: ${requiredText(data.accountNumber)}`,
          `Nội dung chuyển khoản: ${requiredText(data.transferContent)}`,
          `Khách xác nhận lúc: ${requiredText(data.submittedAt)}`,
          "Trạng thái: Chờ admin kiểm tra",
          `XEM VÀ DUYỆT GIAO DỊCH: ${reviewUrl}`,
          "Link chỉ mở giao dịch; không tự động phê duyệt.",
        ].join("\n"),
        html: `
          <h2>Có giao dịch chuyển khoản cần đối soát</h2>
          <p><strong>Trạng thái:</strong> Chờ admin kiểm tra</p>
          <dl>
            <dt>Học viên</dt><dd>${escapeHtml(requiredText(data.studentName))} (${escapeHtml(requiredText(data.studentEmail))})</dd>
            <dt>Khóa học</dt><dd>${escapeHtml(requiredText(data.courseTitle))}</dd>
            <dt>Mã đơn</dt><dd>${escapeHtml(requiredText(data.orderCode))}</dd>
            <dt>Số tiền</dt><dd>${escapeHtml(requiredText(data.amount))} VND</dd>
            <dt>Ngân hàng nhận</dt><dd>${escapeHtml(requiredText(data.bankName))}</dd>
            <dt>Số tài khoản nhận</dt><dd>${escapeHtml(requiredText(data.accountNumber))}</dd>
            <dt>Nội dung chuyển khoản</dt><dd>${escapeHtml(requiredText(data.transferContent))}</dd>
            <dt>Khách xác nhận lúc</dt><dd>${escapeHtml(requiredText(data.submittedAt))}</dd>
          </dl>
          <p><a href="${escapeHtml(reviewUrl)}">Xem và duyệt giao dịch</a></p>
          <p>Link chỉ mở giao dịch; không tự động phê duyệt.</p>
        `.trim(),
      };
    }

    if (job.templateType === "ORDER_REJECTED_STUDENT") {
      if (!job.recipientEmail) throw new MissingRecipientError();
      const orderUrl = data.orderId
        ? `${this.frontendBaseUrl}/student/orders/${encodeURIComponent(requiredText(data.orderId))}`
        : undefined;
      return {
        to: [job.recipientEmail],
        subject: "Giao dịch khóa học chưa được xác nhận",
        text: [
          `Đơn ${requiredText(data.orderCode)} chưa được xác nhận thanh toán.`,
          `Lý do: ${requiredText(data.reason)}`,
          "Vui lòng liên hệ hỗ trợ hoặc kiểm tra lại thông tin chuyển khoản trước khi gửi lại yêu cầu.",
        ].join("\n"),
        ...(orderUrl
          ? {
              html: `<h2>Giao dịch chưa được xác nhận</h2><p>Đơn <strong>${escapeHtml(requiredText(data.orderCode))}</strong> chưa được xác nhận thanh toán.</p><p><strong>Lý do:</strong> ${escapeHtml(requiredText(data.reason))}</p><p><a href="${escapeHtml(orderUrl)}">Mở đơn hàng và gửi lại yêu cầu</a></p>`,
            }
          : {}),
      };
    }

    if (
      job.templateType === "ORDER_APPROVED_STUDENT" ||
      job.templateType === "RENEWAL_APPROVED_STUDENT"
    ) {
      const recipient = job.recipientEmail;
      if (!recipient) throw new MissingRecipientError();
      const relativeUrl = requiredText(data.learningUrl);
      const learningUrl = relativeUrl.startsWith("http")
        ? relativeUrl
        : `${this.frontendBaseUrl}${relativeUrl}`;
      return {
        to: [recipient],
        subject:
          job.templateType === "RENEWAL_APPROVED_STUDENT"
            ? "Your German course renewal is ready"
            : "Your German course access is ready",
        text: [
          job.templateType === "RENEWAL_APPROVED_STUDENT"
            ? `Your course renewal for ${requiredText(data.courseTitle)} has been approved.`
            : `Your course access for ${requiredText(data.courseTitle)} has been approved.`,
          ...(data.orderCode ? [`Order: ${requiredText(data.orderCode)}`] : []),
          `Access duration: ${requiredText(data.durationMonths)} months`,
          ...(data.activatedAt
            ? [`Access starts: ${requiredText(data.activatedAt)}`]
            : []),
          `Access expires: ${requiredText(data.expiresAt)}`,
          ...(this.frontendBaseUrl ? [`Open your course: ${learningUrl}`] : []),
        ].join("\n"),
        html: `<h2>${job.templateType === "RENEWAL_APPROVED_STUDENT" ? "Gia hạn khóa học đã được duyệt" : "Quyền học đã được kích hoạt"}</h2><p>${escapeHtml(requiredText(data.courseTitle))}</p>${data.activatedAt ? `<p>Bắt đầu: ${escapeHtml(requiredText(data.activatedAt))}</p>` : ""}<p>Thời hạn: ${escapeHtml(requiredText(data.durationMonths))} tháng</p><p>Hết hạn: ${escapeHtml(requiredText(data.expiresAt))}</p>${this.frontendBaseUrl ? `<p><a href="${escapeHtml(learningUrl)}">Mở khóa học</a></p>` : ""}`,
      };
    }

    if (job.templateType === "ORDER_CANCELLED_STUDENT") {
      if (!job.recipientEmail) throw new MissingRecipientError();
      return {
        to: [job.recipientEmail],
        subject: "Your pending course order was cancelled",
        text: [
          `Order ${requiredText(data.orderCode)} for ${requiredText(data.courseTitle)} was cancelled.`,
          ...(data.reason ? [`Reason: ${requiredText(data.reason)}`] : []),
          "If you reported a bank transfer, contact support with your transfer receipt.",
        ].join("\n"),
      };
    }

    if (
      job.templateType === "ENROLLMENT_GRANTED_STUDENT" ||
      job.templateType === "ENROLLMENT_REVOKED_STUDENT" ||
      job.templateType === "ENROLLMENT_RESTORED_STUDENT" ||
      job.templateType === "ENROLLMENT_EXTENDED_STUDENT"
    ) {
      if (!job.recipientEmail) throw new MissingRecipientError();
      const courseTitle = requiredText(data.courseTitle);
      const subjectByType = {
        ENROLLMENT_GRANTED_STUDENT: "Course access granted",
        ENROLLMENT_REVOKED_STUDENT: "Course access updated",
        ENROLLMENT_RESTORED_STUDENT: "Course access restored",
        ENROLLMENT_EXTENDED_STUDENT: "Course access extended",
      } as const;
      const messageByType = {
        ENROLLMENT_GRANTED_STUDENT: `You have been granted access to ${courseTitle}.`,
        ENROLLMENT_REVOKED_STUDENT: `Your access to ${courseTitle} has been revoked.`,
        ENROLLMENT_RESTORED_STUDENT: `Your access to ${courseTitle} has been restored.`,
        ENROLLMENT_EXTENDED_STUDENT: `Your access to ${courseTitle} has been extended.`,
      } as const;
      return {
        to: [job.recipientEmail],
        subject: subjectByType[job.templateType],
        text: [
          messageByType[job.templateType],
          ...(data.durationMonths
            ? [`Duration: ${requiredText(data.durationMonths)} months`]
            : []),
          ...(data.expiresAt
            ? [`Access expires: ${requiredText(data.expiresAt)}`]
            : []),
          ...(data.reason ? [`Reason: ${requiredText(data.reason)}`] : []),
        ].join("\n"),
      };
    }

    throw new Error("Unsupported notification template.");
  }
}

class MissingRecipientError extends Error {
  readonly code = "NO_ACTIVE_EMAIL_RECIPIENT";
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("Invalid email template data.");
  return value as Record<string, unknown>;
}

function requiredText(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number")
    throw new Error("Invalid email template value.");
  return String(value)
    .replace(/[\r\n]/g, " ")
    .slice(0, 1000);
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}
