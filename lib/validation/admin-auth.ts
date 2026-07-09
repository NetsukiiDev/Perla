import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const smtpConfigSchema = z.object({
  host: z.string().trim().min(1).max(255),
  port: z.coerce.number().int().min(1).max(65535),
  secure: z.boolean(),
  user: z.string().trim().max(255).optional().nullable(),
  // Empty string means "keep the existing stored password". Only set when
  // the admin types a new one.
  password: z.string().max(512).optional().nullable(),
  fromName: z.string().trim().max(255).optional().nullable(),
  fromEmail: z.string().trim().email().max(255),
  enabled: z.boolean(),
});

export const turnstileConfigSchema = z.object({
  siteKey: z.string().trim().min(1).max(255),
  // Empty string means "keep the existing stored secret key".
  secretKey: z.string().max(512).optional().nullable(),
  enabled: z.boolean(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1),
  newPassword: z.string().min(8).max(200),
  confirmPassword: z.string().min(8).max(200),
});
