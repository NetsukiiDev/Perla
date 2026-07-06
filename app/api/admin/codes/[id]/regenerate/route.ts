// POST /api/admin/codes/[id]/regenerate — assigns a fresh random value to
// the SAME code (one code per participant), resets it to valid, and ends any
// active session. The new plaintext is returned once.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { buildCodeRecord } from "@/lib/invite-code";

const MAX_ATTEMPTS = 5;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const existing = await prisma.inviteCode.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await prisma.session.updateMany({
    where: { inviteCodeId: id, status: "active" },
    data: { status: "expired" },
  });

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rec = buildCodeRecord();
    try {
      const inviteCode = await prisma.inviteCode.update({
        where: { id },
        data: {
          codeHash: rec.codeHash,
          codeEncrypted: rec.codeEncrypted,
          status: "valid",
          activatedAt: null,
          completedAt: null,
          revokedAt: null,
        },
      });
      await prisma.participant.update({
        where: { id: existing.participantId },
        data: { status: "not_started" },
      });
      return NextResponse.json({ code: rec.code, inviteCode }, { status: 200 });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: "generation_failed" }, { status: 500 });
}
