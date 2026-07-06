import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { participantCreateSchema } from "@/lib/validation/admin-participant";
import { buildCodeRecord } from "@/lib/invite-code";
import { DEFAULTS } from "@/lib/constants";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ error: "missing_event_id" }, { status: 400 });
  }

  const participants = await prisma.participant.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ participants });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = participantCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: parsed.data.eventId } });
  if (!event) {
    return NextResponse.json({ error: "event_not_found" }, { status: 404 });
  }

  // Each participant gets a code automatically. Retry on the (astronomically
  // unlikely) hash collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const rec = buildCodeRecord();
    try {
      const participant = await prisma.participant.create({
        data: {
          eventId: parsed.data.eventId,
          displayName: parsed.data.displayName ?? null,
          notes: parsed.data.notes ?? null,
          inviteCodes: {
            create: {
              eventId: parsed.data.eventId,
              codeHash: rec.codeHash,
              codeEncrypted: rec.codeEncrypted,
              status: "valid",
              maxSessions: DEFAULTS.MAX_SESSIONS,
            },
          },
        },
      });
      return NextResponse.json({ participant, code: rec.code }, { status: 201 });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: "generation_failed" }, { status: 500 });
}
