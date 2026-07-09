import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getParticipantSessionContext } from "@/lib/session-participant";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await getParticipantSessionContext();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const eventId = ctx.inviteCode.eventId;
  const announcements = await prisma.announcement.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      message: true,
      createdAt: true,
      imageType: true,
    },
  });

  return NextResponse.json({
    announcements: announcements.map((a) => ({
      id: a.id,
      message: a.message,
      createdAt: a.createdAt.toISOString(),
      imageUrl: a.imageType ? `/api/announcements/${a.id}/image` : null,
    })),
  });
}
