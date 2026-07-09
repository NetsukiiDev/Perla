import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { codeBulkDeleteSchema } from "@/lib/validation/admin-codes";

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = codeBulkDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  const codes = await prisma.inviteCode.findMany({
    where: { eventId: parsed.data.eventId, id: { in: parsed.data.codeIds } },
    select: { id: true, participantId: true },
  });
  if (codes.length === 0) {
    return NextResponse.json({ deletedCodes: 0, deletedParticipants: 0 });
  }

  // Public codes have no participant; only personal codes cascade to one.
  const participantIds = Array.from(
    new Set(codes.map((code) => code.participantId).filter((pid): pid is string => pid !== null)),
  );
  const result =
    participantIds.length > 0
      ? await prisma.participant.deleteMany({
          where: { eventId: parsed.data.eventId, id: { in: participantIds } },
        })
      : { count: 0 };

  return NextResponse.json({
    deletedCodes: codes.length,
    deletedParticipants: result.count,
  });
}
