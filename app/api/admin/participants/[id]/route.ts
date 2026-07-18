import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, assertOwnsEvent } from "@/lib/admin-guard";
import { participantUpdateSchema } from "@/lib/validation/admin-participant";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const existing = await prisma.participant.findUnique({ where: { id }, include: { event: true } });
  if (!existing || !assertOwnsEvent(auth.session, existing.event)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = participantUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;

  const participant = await prisma.participant.update({
    where: { id },
    data: {
      ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
  });

  return NextResponse.json({ participant });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const existing = await prisma.participant.findUnique({ where: { id }, include: { event: true } });
  if (!existing || !assertOwnsEvent(auth.session, existing.event)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await prisma.participant.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
