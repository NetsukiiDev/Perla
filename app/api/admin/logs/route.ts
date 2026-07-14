import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";

const adminTypes = ["admin_login", "admin_login_failed", "admin_action", "password_reset_request", "password_reset_success"] as const;
const eventTypes = ["code_verify_success", "code_verify_invalid", "code_verify_already_used", "code_not_yet_available", "code_not_available", "site_opened", "geolocation_denied", "session_started", "location_update", "step_unlocked", "arrived", "routing_error"] as const;

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
  const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);
  const type = url.searchParams.get("type") || undefined;
  const category = url.searchParams.get("category") || "all";

  const where: Record<string, unknown> = {};
  if (type) {
    where.type = type;
  } else if (category === "admin") {
    where.type = { in: adminTypes };
  } else if (category === "event") {
    where.type = { in: eventTypes };
  }

  const [logs, total] = await Promise.all([
    prisma.accessLog.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        event: { select: { internalName: true } },
        participant: { select: { displayName: true } },
      },
    }),
    prisma.accessLog.count({ where: where as never }),
  ]);

  return NextResponse.json({ logs, total, limit, offset });
}
