// Not in the spec's literal API list, but "sbloccare sessioni" is an
// explicit admin requirement and /block alone can't satisfy it.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const existing = await prisma.session.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (existing.status === "completed" || existing.status === "expired") {
    return NextResponse.json({ error: "not_reactivatable" }, { status: 409 });
  }

  const codeStatus = existing.currentStep > 1 ? "in_progress" : "started";
  const [session] = await prisma.$transaction([
    prisma.session.update({ where: { id }, data: { status: "active" } }),
    prisma.inviteCode.update({ where: { id: existing.inviteCodeId }, data: { status: codeStatus } }),
    prisma.participant.update({ where: { id: existing.participantId }, data: { status: codeStatus } }),
  ]);

  return NextResponse.json({ session });
}
