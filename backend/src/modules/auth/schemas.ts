import { z } from "zod";

const email = z.string().trim().email().max(254);
const password = z.string().min(12).max(128);

export const registerSchema = z.strictObject({
  fullName: z.string().trim().min(1).max(120),
  email,
  password,
});

export const loginSchema = z.strictObject({
  email,
  password: z.string().min(1).max(128),
});
export const forgotPasswordSchema = z.strictObject({ email });
export const resetPasswordSchema = z.strictObject({
  token: z.string().min(32).max(256),
  newPassword: password,
});
