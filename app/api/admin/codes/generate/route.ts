// POST /api/admin/codes/generate — mints a code for a participant that has
// no live code (e.g. after a revoke). The code is stored hashed only; the
// plaintext is returned once in this response.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { codeGenerateSchema } from "@/lib/validation/admin-codes";
import { buildCodeRecord } from "@/lib/invite-code";
import { DEFAULTS } from "@/lib/constants";
import type { InviteCodeStatus } from "@/lib/generated/prisma/client";

const LIVE_STATUS_VALUES: InviteCodeStatus[] = ["created", "valid", "scheduled", "started", "in_progress"];
const LIVE_STATUSES = new Set<InviteCodeStatus>(LIVE_STATUS_VALUES);
const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = codeGenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }
  const { participantId, expiresAt } = parsed.data;

  const participant = await prisma.participant.findUnique({ where: { id: participantId } });
  if (!participant) {
    return NextResponse.json({ error: "participant_not_found" }, { status: 404 });
  }

  const existingLive = await prisma.inviteCode.findFirst({
    where: { participantId, status: { in: LIVE_STATUS_VALUES } },
  });
  if (existingLive && LIVE_STATUSES.has(existingLive.status)) {
    return NextResponse.json({ error: "code_already_exists" }, { status: 409 });
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rec = buildCodeRecord();

    try {
      const inviteCode = await prisma.inviteCode.create({
        data: {
          eventId: participant.eventId,
          participantId,
          codeHash: rec.codeHash,
          codeEncrypted: rec.codeEncrypted,
          status: "valid",
          maxSessions: DEFAULTS.MAX_SESSIONS,
          expiresAt: expiresAt ?? null,
        },
      });
      return NextResponse.json({ code: rec.code, inviteCode }, { status: 201 });
    } catch {
      // Unique constraint collision on codeHash — extremely unlikely, retry.
      continue;
    }
  }

  return NextResponse.json({ error: "generation_failed" }, { status: 500 });
}
