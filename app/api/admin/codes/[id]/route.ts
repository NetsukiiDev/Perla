import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, assertOwnsEvent } from "@/lib/admin-guard";
import { codeUpdateSchema } from "@/lib/validation/admin-codes";
import { buildCodeRecord } from "@/lib/invite-code";
import { getLocale, getDictionary } from "@/lib/i18n/server";

// PATCH — set a custom code value (admin-chosen). Resets it to valid and
// ends any active session, like a regenerate but with a specific value.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const locale = await getLocale();
  const t = getDictionary(locale);
  const body = await req.json().catch(() => null);
  const parsed = codeUpdateSchema(t).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }

  const existing = await prisma.inviteCode.findUnique({ where: { id }, include: { event: true } });
  if (!existing || !assertOwnsEvent(auth.session, existing.event)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const rec = buildCodeRecord(parsed.data.code);

  // Reject if the chosen code collides with another code.
  const clash = await prisma.inviteCode.findUnique({ where: { codeHash: rec.codeHash } });
  if (clash && clash.id !== id) {
    return NextResponse.json({ error: "code_taken" }, { status: 409 });
  }

  await prisma.session.updateMany({
    where: { inviteCodeId: id, status: "active" },
    data: { status: "expired" },
  });

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
  if (existing.participantId) {
    await prisma.participant.update({ where: { id: existing.participantId }, data: { status: "not_started" } });
  }

  return NextResponse.json({ code: rec.code, inviteCode });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const existing = await prisma.inviteCode.findUnique({ where: { id }, include: { event: true } });
  if (!existing || !assertOwnsEvent(auth.session, existing.event)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.inviteCode.delete({ where: { id } }),
    ...(existing.participantId
      ? [prisma.participant.update({ where: { id: existing.participantId }, data: { status: "not_started" } })]
      : []),
  ]);
  return NextResponse.json({ ok: true });
}
