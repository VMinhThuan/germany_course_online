import { z } from "zod";

const optionalText = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().optional(),
);
const truthy = z.preprocess(
  (value) => (value === undefined ? "false" : value),
  z.enum(["true", "false"]).transform((value) => value === "true"),
);

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  MONGODB_URI: z
    .string()
    .min(1)
    .refine(
      (value) =>
        value.startsWith("mongodb://") || value.startsWith("mongodb+srv://"),
    ),
  MONGODB_DB_NAME: z
    .string()
    .trim()
    .min(1)
    .regex(/^[A-Za-z0-9_-]+$/),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().url(),
  JWT_AUDIENCE: z.string().trim().min(1),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(3600)
    .default(900),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  APP_ORIGINS: z.string().trim().min(1),
  CRON_SECRET: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(32).optional(),
  ),
  COOKIE_SECURE: truthy.default(false),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  PASSWORD_RESET_URL: optionalText.pipe(z.string().url().optional()),
  SMTP_HOST: optionalText,
  SMTP_PORT: z.preprocess(
    (value) =>
      value === "" || value === undefined ? undefined : Number(value),
    z.number().int().min(1).max(65_535).optional(),
  ),
  SMTP_USER: optionalText,
  SMTP_PASSWORD: optionalText,
  SMTP_FROM: optionalText,
  MEDIA_S3_ENDPOINT: optionalText.pipe(z.string().url().optional()),
  MEDIA_S3_BUCKET: optionalText,
  MEDIA_S3_REGION: optionalText,
  MEDIA_S3_ACCESS_KEY_ID: optionalText,
  MEDIA_S3_SECRET_ACCESS_KEY: optionalText,
  MEDIA_SIGNED_URL_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(900)
    .default(300),
});

export type AppConfig = {
  nodeEnv: "development" | "test" | "production";
  port: number;
  mongoUri: string;
  databaseName: string;
  jwtAccessSecret: string;
  jwtIssuer: string;
  jwtAudience: string;
  accessTokenTtlSeconds: number;
  sessionTtlDays: number;
  allowedOrigins: string[];
  cronSecret?: string;
  cookieSecure: boolean;
  cookieSameSite: "lax" | "strict" | "none";
  passwordResetUrl: string | undefined;
  smtp:
    | {
        host: string;
        port: number;
        user: string | undefined;
        password: string | undefined;
        from: string;
      }
    | undefined;
  mediaStorage:
    | {
        endpoint: string;
        bucket: string;
        region: string;
        accessKeyId: string;
        secretAccessKey: string;
        signedUrlTtlSeconds: number;
      }
    | undefined;
};

export function parseEnvironment(
  input: NodeJS.ProcessEnv | Record<string, string | undefined>,
): AppConfig {
  const parsed = environmentSchema.safeParse(input);
  if (!parsed.success) {
    const fields = parsed.error.issues
      .map((issue) => issue.path.join(".") || "environment")
      .join(", ");
    throw new Error(`Invalid environment configuration: ${fields}`);
  }

  const env = parsed.data;
  const origins = env.APP_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  let normalizedOrigins: string[];
  try {
    normalizedOrigins = origins.map((origin) => {
      const parsedOrigin = new URL(origin);
      if (
        !["http:", "https:"].includes(parsedOrigin.protocol) ||
        parsedOrigin.origin !== origin
      )
        throw new Error();
      return parsedOrigin.origin;
    });
  } catch {
    throw new Error("Invalid environment configuration: APP_ORIGINS");
  }
  if (
    !normalizedOrigins.length ||
    new Set(normalizedOrigins).size !== normalizedOrigins.length
  ) {
    throw new Error("Invalid environment configuration: APP_ORIGINS");
  }
  if (
    env.NODE_ENV === "production" &&
    normalizedOrigins.some((origin) => new URL(origin).protocol !== "https:")
  ) {
    throw new Error(
      "Invalid environment configuration: APP_ORIGINS must use HTTPS in production",
    );
  }
  if (
    env.NODE_ENV === "production" &&
    env.PASSWORD_RESET_URL &&
    new URL(env.PASSWORD_RESET_URL).protocol !== "https:"
  ) {
    throw new Error(
      "Invalid environment configuration: PASSWORD_RESET_URL must use HTTPS in production",
    );
  }

  let mongoHost: string;
  try {
    mongoHost = new URL(
      env.MONGODB_URI.replace(/^mongodb\+srv:/, "https:").replace(
        /^mongodb:/,
        "http:",
      ),
    ).hostname.replace(/^\[|\]$/g, "");
  } catch {
    throw new Error("Invalid environment configuration: MONGODB_URI");
  }
  if (
    env.NODE_ENV !== "production" &&
    !["localhost", "127.0.0.1", "::1"].includes(mongoHost)
  ) {
    throw new Error(
      "Invalid environment configuration: development/test MongoDB must use a loopback host",
    );
  }
  if (
    env.NODE_ENV === "test" &&
    !env.MONGODB_DB_NAME.toLowerCase().includes("test")
  ) {
    throw new Error(
      'Invalid environment configuration: test database name must include "test"',
    );
  }
  if (
    env.NODE_ENV === "production" &&
    (!env.COOKIE_SECURE ||
      (env.COOKIE_SAME_SITE === "none" && !env.COOKIE_SECURE))
  ) {
    throw new Error(
      "Invalid environment configuration: production refresh cookies must be Secure",
    );
  }
  if (
    env.NODE_ENV === "development" &&
    /(^|[_-])(test|testing|prod|production)([_-]|$)/i.test(env.MONGODB_DB_NAME)
  ) {
    throw new Error(
      "Invalid environment configuration: development database name must be development-scoped",
    );
  }
  if (
    env.NODE_ENV === "production" &&
    /(^|[_-])(dev|development|test|testing)([_-]|$)/i.test(env.MONGODB_DB_NAME)
  ) {
    throw new Error(
      "Invalid environment configuration: production database name cannot be development/test-scoped",
    );
  }

  const smtpValues = [env.SMTP_HOST, env.SMTP_PORT, env.SMTP_FROM];
  const anySmtp = [
    env.SMTP_HOST,
    env.SMTP_PORT,
    env.SMTP_USER,
    env.SMTP_PASSWORD,
    env.SMTP_FROM,
  ].some((value) => value !== undefined);
  if (anySmtp && smtpValues.some((value) => value === undefined)) {
    throw new Error(
      "Invalid environment configuration: SMTP_HOST, SMTP_PORT, and SMTP_FROM are required together",
    );
  }
  if (anySmtp && Boolean(env.SMTP_USER) !== Boolean(env.SMTP_PASSWORD)) {
    throw new Error(
      "Invalid environment configuration: SMTP_USER and SMTP_PASSWORD must be provided together",
    );
  }
  if (anySmtp && !env.PASSWORD_RESET_URL) {
    throw new Error(
      "Invalid environment configuration: PASSWORD_RESET_URL is required when SMTP is configured",
    );
  }

  const mediaValues = [
    env.MEDIA_S3_ENDPOINT,
    env.MEDIA_S3_BUCKET,
    env.MEDIA_S3_REGION,
    env.MEDIA_S3_ACCESS_KEY_ID,
    env.MEDIA_S3_SECRET_ACCESS_KEY,
  ];
  const anyMedia = mediaValues.some((value) => value !== undefined);
  if (anyMedia && mediaValues.some((value) => value === undefined)) {
    throw new Error(
      "Invalid environment configuration: all MEDIA_S3_* settings are required together",
    );
  }
  if (anyMedia) {
    const endpoint = new URL(env.MEDIA_S3_ENDPOINT!);
    if (
      !["http:", "https:"].includes(endpoint.protocol) ||
      (env.NODE_ENV === "production" && endpoint.protocol !== "https:")
    ) {
      throw new Error(
        "Invalid environment configuration: MEDIA_S3_ENDPOINT must use HTTPS in production",
      );
    }
  }

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    mongoUri: env.MONGODB_URI,
    databaseName: env.MONGODB_DB_NAME,
    jwtAccessSecret: env.JWT_ACCESS_SECRET,
    jwtIssuer: env.JWT_ISSUER,
    jwtAudience: env.JWT_AUDIENCE,
    accessTokenTtlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
    sessionTtlDays: env.SESSION_TTL_DAYS,
    allowedOrigins: normalizedOrigins,
    ...(env.CRON_SECRET ? { cronSecret: env.CRON_SECRET } : {}),
    cookieSecure: env.COOKIE_SECURE,
    cookieSameSite: env.COOKIE_SAME_SITE,
    passwordResetUrl: env.PASSWORD_RESET_URL,
    smtp: anySmtp
      ? {
          host: env.SMTP_HOST!,
          port: env.SMTP_PORT!,
          user: env.SMTP_USER,
          password: env.SMTP_PASSWORD,
          from: env.SMTP_FROM!,
        }
      : undefined,
    mediaStorage: anyMedia
      ? {
          endpoint: env.MEDIA_S3_ENDPOINT!,
          bucket: env.MEDIA_S3_BUCKET!,
          region: env.MEDIA_S3_REGION!,
          accessKeyId: env.MEDIA_S3_ACCESS_KEY_ID!,
          secretAccessKey: env.MEDIA_S3_SECRET_ACCESS_KEY!,
          signedUrlTtlSeconds: env.MEDIA_SIGNED_URL_TTL_SECONDS,
        }
      : undefined,
  };
}
