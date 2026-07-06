import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const existing = await prisma.session.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [session] = await prisma.$transaction([
    prisma.session.update({ where: { id }, data: { status: "blocked" } }),
    prisma.inviteCode.update({ where: { id: existing.inviteCodeId }, data: { status: "blocked" } }),
    prisma.participant.update({ where: { id: existing.participantId }, data: { status: "blocked" } }),
  ]);

  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ session });
}
