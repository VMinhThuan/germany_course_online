import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import type { EmailService, NotificationEmail } from "../auth/email-service.js";
import { EmailLog, User } from "../../db/models/index.js";

const MAX_ATTEMPTS = 5;
const LEASE_MS = 60_000;
const BASE_BACKOFF_MS = 30_000;
const MAX_BACKOFF_MS = 30 * 60_000;

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

  constructor(
    private readonly emailService: EmailService,
    options: WorkerOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.frontendBaseUrl = (options.frontendBaseUrl ?? "").replace(/\/$/, "");
    this.adminNotificationEmail = options.adminNotificationEmail;
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

  /**
   * Re-queue one failed notification for an explicit Admin retry.
   * The compare-and-set keeps two Admin clicks from creating two deliveries.
   */
  async retryMessage(messageId: Types.ObjectId | string): Promise<boolean> {
    if (!this.emailService.available) return false;
    const id =
      typeof messageId === "string" ? new Types.ObjectId(messageId) : messageId;
    const now = this.now();
    const reset = await EmailLog.updateOne(
      {
        _id: id,
        status: { $in: ["PENDING", "FAILED"] },
        errorMessage: { $ne: null },
      },
      {
        $set: {
          status: "PENDING",
          availableAt: now,
          errorMessage: null,
          lastErrorCode: null,
          leaseExpiresAt: null,
          leaseToken: null,
        },
      },
    );
    if (reset.modifiedCount !== 1) return false;
    await this.processMessage(id);
    return true;
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
              : "Notification delivery failed; Admin retry required.",
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
      const orderCode = requiredText(data.orderCode);
      const studentName = requiredText(data.studentName);
      const studentEmail = requiredText(data.studentEmail);
      const courseTitle = requiredText(data.courseTitle);
      const amount = formatVndAmount(requiredText(data.amount));
      const bankName = requiredText(data.bankName);
      const accountNumber = requiredText(data.accountNumber);
      const transferContent = requiredText(data.transferContent);
      const submittedAt = formatEmailDate(requiredText(data.submittedAt));
      const attemptNumber = data.attemptNumber
        ? requiredText(data.attemptNumber)
        : undefined;
      const reviewUrl = `${this.frontendBaseUrl}/admin/orders/${encodeURIComponent(requiredText(data.orderId))}`;
      return {
        to: recipients,
        subject: `[LMS] Cần đối soát giao dịch · ${orderCode}`,
        text: [
          "Có giao dịch chuyển khoản cần đối soát thủ công.",
          `Học viên: ${studentName} (${studentEmail})`,
          `Khóa học: ${courseTitle}`,
          `Mã đơn: ${orderCode}`,
          `Số tiền: ${amount}`,
          `Ngân hàng nhận: ${bankName}`,
          `Số tài khoản nhận: ${accountNumber}`,
          `Nội dung chuyển khoản: ${transferContent}`,
          `Khách xác nhận lúc: ${submittedAt}`,
          ...(attemptNumber ? [`Lần xác nhận: ${attemptNumber}`] : []),
          "Trạng thái: Chờ admin kiểm tra",
          `XEM VÀ DUYỆT GIAO DỊCH: ${reviewUrl}`,
          "Link chỉ mở giao dịch; không tự động phê duyệt.",
        ].join("\n"),
        html: buildAdminTransferNotificationHtml({
          orderCode,
          studentName,
          studentEmail,
          courseTitle,
          amount,
          bankName,
          accountNumber,
          transferContent,
          submittedAt,
          ...(attemptNumber ? { attemptNumber } : {}),
          reviewUrl,
        }),
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

function formatVndAmount(value: string): string {
  return /^\d+$/.test(value)
    ? `${value.replace(/\B(?=(\d{3})+(?!\d))/g, ".")} ₫`
    : `${value} VND`;
}

function formatEmailDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function emailDetailRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #e5eef0;color:#60747c;font-size:13px;line-height:20px;width:38%;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:12px 0;border-bottom:1px solid #e5eef0;color:#203039;font-size:14px;font-weight:600;line-height:20px;text-align:right;vertical-align:top;word-break:break-word;">${escapeHtml(value)}</td>
    </tr>`;
}

function buildAdminTransferNotificationHtml(input: {
  orderCode: string;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  amount: string;
  bankName: string;
  accountNumber: string;
  transferContent: string;
  submittedAt: string;
  attemptNumber?: string;
  reviewUrl: string;
}): string {
  const attemptRow = input.attemptNumber
    ? emailDetailRow("Lần xác nhận", input.attemptNumber)
    : "";
  const preheader = `Giao dịch ${input.orderCode} đang chờ Admin đối soát.`;

  return `
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(preheader)}</title>
  </head>
  <body style="margin:0;background:#f4f9fa;color:#203039;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f9fa;">
      <tr>
        <td align="center" style="padding:28px 12px 40px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#ffffff;border:1px solid #dce9eb;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px;background:#006b70;color:#ffffff;">
                <div style="font-size:20px;font-weight:700;letter-spacing:.2px;">PAniverseDeutsch</div>
                <div style="margin-top:7px;color:#c9f2f0;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Thông báo quản trị</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <div style="display:inline-block;padding:7px 11px;border-radius:999px;background:#fff1d8;color:#8a5a00;font-size:12px;font-weight:700;">● Chờ đối soát</div>
                <h1 style="margin:18px 0 10px;color:#203039;font-size:25px;line-height:34px;">Có giao dịch cần kiểm tra</h1>
                <p style="margin:0;color:#60747c;font-size:15px;line-height:24px;">Học viên đã gửi xác nhận chuyển khoản. Vui lòng đối soát giao dịch trong ngân hàng trước khi phê duyệt quyền học.</p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;border:1px solid #f2cbd8;border-radius:14px;background:#fff7fa;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <div style="color:#8b6470;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Số tiền cần đối soát</div>
                      <div style="margin-top:5px;color:#006b70;font-size:28px;font-weight:700;line-height:36px;">${escapeHtml(input.amount)}</div>
                      <div style="margin-top:4px;color:#60747c;font-size:13px;">Mã đơn: <strong style="color:#203039;">${escapeHtml(input.orderCode)}</strong></div>
                    </td>
                  </tr>
                </table>

                <h2 style="margin:28px 0 4px;color:#203039;font-size:17px;line-height:25px;">Thông tin giao dịch</h2>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  ${emailDetailRow("Học viên", `${input.studentName} (${input.studentEmail})`)}
                  ${emailDetailRow("Khóa học", input.courseTitle)}
                  ${emailDetailRow("Ngân hàng nhận", input.bankName)}
                  ${emailDetailRow("Số tài khoản", input.accountNumber)}
                  ${emailDetailRow("Nội dung chuyển khoản", input.transferContent)}
                  ${emailDetailRow("Khách xác nhận lúc", input.submittedAt)}
                  ${attemptRow}
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;">
                  <tr>
                    <td align="center">
                      <a href="${escapeHtml(input.reviewUrl)}" style="display:inline-block;padding:14px 24px;border-radius:10px;background:#006b70;color:#ffffff;font-size:15px;font-weight:700;line-height:22px;text-decoration:none;">Xem và duyệt giao dịch</a>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:22px;background:#f4f9fa;border-radius:12px;">
                  <tr>
                    <td style="padding:14px 16px;color:#60747c;font-size:12px;line-height:19px;">Nút trên chỉ mở trang chi tiết giao dịch. Hệ thống không tự động phê duyệt thanh toán.</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px;border-top:1px solid #e5eef0;color:#8a9aa0;font-size:12px;line-height:19px;">Email tự động từ PAniverseDeutsch · Vui lòng không trả lời email này.</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();
}
