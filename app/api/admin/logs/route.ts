import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/admin-guard";
import { ADMIN_LOG_TYPES, EVENT_LOG_TYPES } from "@/lib/log-types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireAdminUser(["admin"]);
  if ("response" in auth) return auth.response;

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
  const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);
  const type = url.searchParams.get("type") || undefined;
  const category = url.searchParams.get("category") || "all";
  const actor = url.searchParams.get("actor") || undefined;

  const where: Record<string, unknown> = {};
  if (type) {
    where.type = type;
  } else if (category === "admin") {
    where.type = { in: ADMIN_LOG_TYPES };
  } else if (category === "event") {
    where.type = { in: EVENT_LOG_TYPES };
  }
  // Combines with the type/category filter above rather than replacing it —
  // "only failed logins by this admin" is a reasonable thing to want.
  if (actor) {
    where.actorEmail = actor;
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
