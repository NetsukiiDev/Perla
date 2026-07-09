// POST /api/admin/settings/smtp/test — send a test email using the stored
// SMTP config (admin only). Accepts an optional `to` override.
import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-guard";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { sendMail, getSmtpConfig } from "@/lib/mailer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireAdminUser();
  if ("response" in auth) return auth.response;

  const locale = await getLocale();
  const t = getDictionary(locale);
  const body = await req.json().catch(() => ({}));
  const override = typeof body?.to === "string" ? body.to.trim() : "";

  const cfg = await getSmtpConfig();
  const to = override || cfg?.fromEmail;
  if (!to) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const ok = await sendMail({
    to,
    subject: `[Perla] ${t.settings.smtp.testSent}`,
    text: t.settings.smtp.testSent,
    html: `<p>${t.settings.smtp.testSent}</p>`,
  });

  if (!ok) {
    return NextResponse.json({ error: "test_failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
