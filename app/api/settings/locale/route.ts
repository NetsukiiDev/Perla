// POST /api/settings/locale — persists the UI language choice in a cookie.
// Public (no auth): the participant flow is localized too.
import { NextResponse } from "next/server";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/config";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const locale = body?.locale;
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "invalid_locale" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true, locale });
  res.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  });
  return res;
}
