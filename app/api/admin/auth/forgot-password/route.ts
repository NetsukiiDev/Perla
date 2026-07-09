// POST /api/admin/auth/forgot-password (public) — request a password reset
// link by email. Always returns the same generic success response to avoid
// user-enumeration; the email is only sent when the account exists and SMTP
// is configured & enabled.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validation/admin-auth";
import { sha256Hex, generateRandomToken } from "@/lib/hash";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { sendMail } from "@/lib/mailer";
import { requestUrl } from "@/lib/request-url";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-context";
import { writeAccessLog } from "@/lib/access-log";
import { AccessLogType } from "@/lib/generated/prisma/client";

export const runtime = "nodejs";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limit = rateLimit(rateLimitKey(ip, "forgot-password"), { windowMs: 15 * 60_000, max: 5 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const locale = await getLocale();
  const t = getDictionary(locale);
  const body = await req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.adminUser.findUnique({ where: { email } }).catch(() => null);

  // Generic response regardless of whether the account exists.
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const token = generateRandomToken(32);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await prisma.passwordResetToken.create({
    data: {
      adminUserId: user.id,
      tokenHash: sha256Hex(token),
      expiresAt,
    },
  });

  const resetUrl = requestUrl(req, `/admin/reset-password?token=${token}`);
  const subject = `[Perla] ${t.login.resetPassword.title}`;
  const text =
    `${t.login.forgotPassword.description}\n\n` +
    `${resetUrl.toString()}\n\n` +
    t.login.resetPassword.errors.expired;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto">
      <h2>${t.login.resetPassword.title}</h2>
      <p>${t.login.forgotPassword.description}</p>
      <p><a href="${resetUrl.toString()}" style="display:inline-block;padding:10px 16px;background:#111827;color:#fff;border-radius:8px;text-decoration:none">${t.login.resetPassword.submit}</a></p>
      <p style="color:#6b7280;font-size:13px">${t.login.resetPassword.errors.expired}</p>
    </div>`;

  const sent = await sendMail({ to: user.email, subject, text, html });

  await writeAccessLog({
    type: AccessLogType.password_reset_request,
    metadata: { userId: user.id, sent },
  });

  return NextResponse.json({ ok: true });
}
