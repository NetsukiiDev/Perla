// Retention cleanup, triggered by Vercel Cron (GET) or manually (POST).
// Vercel attaches `Authorization: Bearer <CRON_SECRET>` automatically when
// CRON_SECRET is set as a project env var; see vercel.json for the
// schedule and README.md for the manual-trigger setup note.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function runRetention() {
  const now = new Date();

  const expiredLocations = await prisma.locationUpdate.deleteMany({
    where: { expiresAt: { lt: now } },
  });

  const closedEventLocations = await prisma.locationUpdate.deleteMany({
    where: { session: { inviteCode: { event: { status: { in: ["closed", "archived"] } } } } },
  });

  const staleSessions = await prisma.session.updateMany({
    where: {
      status: "active",
      OR: [
        { inviteCode: { event: { status: { in: ["closed", "archived"] } } } },
        { inviteCode: { event: { endsAt: { lt: now } } } },
      ],
    },
    data: { status: "expired" },
  });

  return {
    deletedExpiredLocations: expiredLocations.count,
    deletedClosedEventLocations: closedEventLocations.count,
    expiredStaleSessions: staleSessions.count,
  };
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runRetention();
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(req: Request) {
  return GET(req);
}
