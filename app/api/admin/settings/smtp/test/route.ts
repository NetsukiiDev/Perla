// POST /api/admin/settings/smtp/test — send a test email using the stored
// SMTP config (admin only). Accepts an optional `to` override; defaults to
// the calling admin's own address (an inbox they can actually check), not
// the configured "from" address — a "no-reply@…" sender is typically not a
// monitored mailbox, so defaulting to it made the test look silently broken.
import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-guard";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { sendMail } from "@/lib/mailer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireAdminUser();
  if ("response" in auth) return auth.response;

  const locale = await getLocale();
  const t = getDictionary(locale);
  const body = await req.json().catch(() => ({}));
  const override = typeof body?.to === "string" ? body.to.trim() : "";

  const to = override || auth.user.email;
  if (!to) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const result = await sendMail({
    to,
    subject: `[Perla] ${t.settings.smtp.testSent}`,
    text: t.settings.smtp.testSent,
    html: `<p>${t.settings.smtp.testSent}</p>`,
  });

  if (!result.ok) {
    return NextResponse.json({ error: "test_failed", detail: result.error ?? null }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
