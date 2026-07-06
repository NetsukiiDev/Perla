import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { decrypt } from "@/lib/crypto";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ error: "missing_event_id" }, { status: 400 });
  }

  const codes = await prisma.inviteCode.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
    include: { participant: true },
  });

  return NextResponse.json({
    codes: codes.map((c) => ({
      id: c.id,
      code: c.codeEncrypted ? decrypt(c.codeEncrypted) : null,
      participantId: c.participantId,
      participantName: c.participant.displayName,
      status: c.status,
      maxSessions: c.maxSessions,
      expiresAt: c.expiresAt,
      activatedAt: c.activatedAt,
      completedAt: c.completedAt,
      revokedAt: c.revokedAt,
      createdAt: c.createdAt,
    })),
  });
}
