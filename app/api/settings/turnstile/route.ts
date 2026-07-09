import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const cfg = await prisma.turnstileConfig.findUnique({ where: { id: "default" } });
    if (cfg?.enabled && cfg.siteKey) {
      return NextResponse.json({ siteKey: cfg.siteKey, enabled: true });
    }
  } catch {
    // turnstile_config table may not exist yet — fall through to env / disabled.
  }
  const envSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (envSiteKey) {
    return NextResponse.json({ siteKey: envSiteKey, enabled: true });
  }
  return NextResponse.json({ siteKey: null, enabled: false });
}
