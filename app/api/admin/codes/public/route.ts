// POST /api/admin/codes/public — mints a PUBLIC code for an event: reusable
// by many guests (each start spawns a guest participant + session), with a
// usage cap (maxSessions) and no expiry. Not tied to a participant. The
// plaintext is returned once in this response.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEventAccess } from "@/lib/admin-guard";
import { codePublicCreateSchema } from "@/lib/validation/admin-codes";
import { buildCodeRecord } from "@/lib/invite-code";

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = codePublicCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }
  const { eventId, maxSessions } = parsed.data;

  const auth = await requireEventAccess(eventId);
  if ("response" in auth) return auth.response;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rec = buildCodeRecord();
    try {
      const inviteCode = await prisma.inviteCode.create({
        data: {
          eventId,
          participantId: null,
          codeHash: rec.codeHash,
          codeEncrypted: rec.codeEncrypted,
          status: "valid",
          isPublic: true,
          maxSessions,
          expiresAt: null,
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
