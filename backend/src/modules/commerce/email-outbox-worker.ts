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
  intervalMs?: number;
  frontendBaseUrl?: string;
};

type OutboxJob = {
  _id: Types.ObjectId;
  userId?: { toString(): string } | null;
  recipientType: "ADMIN" | "STUDENT";
  recipientEmail?: string | null;
  templateType:
    | "TRANSFER_SUBMITTED_ADMIN"
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
  private readonly intervalMs: number;
  private readonly frontendBaseUrl: string;
  private interval: NodeJS.Timeout | undefined;
  private activePoll: Promise<number> | undefined;
  private stopping = false;

  constructor(
    private readonly emailService: EmailService,
    options: WorkerOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.intervalMs = options.intervalMs ?? 5_000;
    this.frontendBaseUrl = (options.frontendBaseUrl ?? "").replace(/\/$/, "");
  }

  start(): void {
    if (this.interval || this.stopping || !this.emailService.available) return;
    void this.runOnce().catch(() => undefined);
    this.interval = setInterval(() => {
      if (!this.stopping && !this.activePoll)
        void this.runOnce().catch(() => undefined);
    }, this.intervalMs);
    this.interval.unref();
  }

  async stop(): Promise<void> {
    this.stopping = true;
    if (this.interval) clearInterval(this.interval);
    this.interval = undefined;
    await this.activePoll?.catch(() => undefined);
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

  private async processBatch(limit: number): Promise<number> {
    let processed = 0;
    for (let index = 0; index < limit; index += 1) {
      if (this.stopping) break;
      const job = await this.claim();
      if (!job) break;
      await this.deliver(job);
      processed += 1;
    }
    return processed;
  }

  private async claim(): Promise<OutboxJob | null> {
    const now = this.now();
    return EmailLog.findOneAndUpdate(
      {
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
      const admins = await User.find({ role: "ADMIN", status: "ACTIVE" })
        .select("email")
        .lean();
      const recipients = [
        ...new Set(admins.map((admin) => admin.email).filter(Boolean)),
      ];
      if (!recipients.length) throw new MissingRecipientError();
      return {
        to: recipients,
        subject: "A student reported a bank transfer",
        text: [
          "A bank transfer has been reported and requires manual review.",
          `Order: ${requiredText(data.orderCode)}`,
          `Student: ${requiredText(data.studentName)} (${requiredText(data.studentEmail)})`,
          `Course: ${requiredText(data.courseTitle)}`,
          `Amount: ${requiredText(data.amount)} VND`,
          `Submitted at: ${requiredText(data.submittedAt)}`,
          "Review the incoming bank transaction in the Admin order queue before approving.",
        ].join("\n"),
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
          `Access expires: ${requiredText(data.expiresAt)}`,
          ...(this.frontendBaseUrl ? [`Open your course: ${learningUrl}`] : []),
        ].join("\n"),
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
