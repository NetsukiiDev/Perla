import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEventAccess } from "@/lib/admin-guard";
import { participantBulkCreateSchema } from "@/lib/validation/admin-participant";
import { buildCodeRecord } from "@/lib/invite-code";
import { DEFAULTS } from "@/lib/constants";

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = participantBulkCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  const auth = await requireEventAccess(parsed.data.eventId);
  if ("response" in auth) return auth.response;

  const created = await prisma.$transaction(async (tx) => {
    const rows: { id: string; displayName: string | null; codeId: string; code: string }[] = [];

    for (let index = 1; index <= parsed.data.count; index++) {
      const displayNamePrefix = parsed.data.displayNamePrefix?.trim();
      const displayName = displayNamePrefix ? `${displayNamePrefix} ${String(index).padStart(2, "0")}` : null;
      let saved = false;

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const rec = buildCodeRecord();

        try {
          const participant = await tx.participant.create({
            data: {
              eventId: parsed.data.eventId,
              displayName,
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
            include: { inviteCodes: { orderBy: { createdAt: "desc" }, take: 1 } },
          });

          const inviteCode = participant.inviteCodes[0];
          if (!inviteCode) throw new Error("missing_invite_code");

          rows.push({
            id: participant.id,
            displayName: participant.displayName,
            codeId: inviteCode.id,
            code: rec.code,
          });
          saved = true;
          break;
        } catch {
          continue;
        }
      }

      if (!saved) {
        throw new Error("generation_failed");
      }
    }

    return rows;
  });

  return NextResponse.json({ participants: created }, { status: 201 });
}
