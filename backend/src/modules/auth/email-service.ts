import nodemailer, { type Transporter } from "nodemailer";
import type { AppConfig } from "../../config/env.js";

export type PasswordResetEmail = {
  to: string;
  resetUrl: string;
  expiresAt: Date;
};

export type NotificationEmail = {
  to: string[];
  subject: string;
  text: string;
};

export type EmailDeliveryResult = { messageId?: string };

export interface EmailService {
  readonly available: boolean;
  sendPasswordReset(message: PasswordResetEmail): Promise<void>;
  sendNotification(message: NotificationEmail): Promise<EmailDeliveryResult>;
}

export class FakeEmailService implements EmailService {
  readonly available = true;
  readonly deliveries: PasswordResetEmail[] = [];
  readonly notificationDeliveries: NotificationEmail[] = [];
  notificationFailuresRemaining = 0;

  async sendPasswordReset(message: PasswordResetEmail): Promise<void> {
    this.deliveries.push(message);
  }

  async sendNotification(
    message: NotificationEmail,
  ): Promise<EmailDeliveryResult> {
    if (this.notificationFailuresRemaining > 0) {
      this.notificationFailuresRemaining -= 1;
      throw new Error("Simulated notification delivery failure.");
    }
    this.notificationDeliveries.push(message);
    return { messageId: `fake-${this.notificationDeliveries.length}` };
  }
}

class SmtpEmailService implements EmailService {
  readonly available = true;
  private readonly transporter: Transporter;

  constructor(private readonly config: AppConfig) {
    const smtp = config.smtp;
    if (!smtp) throw new Error("SMTP configuration is required.");
    this.transporter = nodemailer.createTransport(
      createSmtpTransportOptions(smtp),
    );
  }

  async sendPasswordReset(message: PasswordResetEmail): Promise<void> {
    const smtp = this.config.smtp;
    if (!smtp) return;
    await this.transporter.sendMail({
      from: smtp.from,
      to: message.to,
      subject: "Reset your PAniverseDeutsch password",
      text: `Use this one-time link to reset your password: ${message.resetUrl}\nThis link expires at ${message.expiresAt.toISOString()}.`,
    });
  }

  async sendNotification(
    message: NotificationEmail,
  ): Promise<EmailDeliveryResult> {
    const smtp = this.config.smtp;
    if (!smtp) throw new Error("SMTP is not configured.");
    const result = await this.transporter.sendMail({
      from: smtp.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
    return { messageId: result.messageId };
  }
}

export function createSmtpTransportOptions(
  smtp: NonNullable<AppConfig["smtp"]>,
) {
  return {
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    requireTLS: smtp.port !== 465,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
    auth:
      smtp.user && smtp.password
        ? { user: smtp.user, pass: smtp.password }
        : undefined,
  };
}

class UnavailableEmailService implements EmailService {
  readonly available = false;
  async sendPasswordReset(): Promise<void> {
    throw new Error("SMTP is not configured.");
  }

  async sendNotification(): Promise<EmailDeliveryResult> {
    throw new Error("SMTP is not configured.");
  }
}

export function createEmailService(config: AppConfig): EmailService {
  if (config.smtp) return new SmtpEmailService(config);
  if (config.nodeEnv === "development" || config.nodeEnv === "test")
    return new FakeEmailService();
  return new UnavailableEmailService();
}
