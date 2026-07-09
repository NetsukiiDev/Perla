import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { eventUpdateSchema } from "@/lib/validation/admin-event";
import { decryptCoord, encryptCoord } from "@/lib/crypto";
import { detectItalianRegion } from "@/lib/detect-italian-region";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = eventUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const destinationLat =
    data.destinationLat !== undefined ? data.destinationLat : decryptCoord(existing.destinationLatEncrypted);
  const destinationLng =
    data.destinationLng !== undefined ? data.destinationLng : decryptCoord(existing.destinationLngEncrypted);
  const region =
    data.destinationLat !== undefined || data.destinationLng !== undefined
      ? detectItalianRegion(destinationLat, destinationLng)
      : null;
  if ((data.destinationLat !== undefined || data.destinationLng !== undefined) && !region) {
    return NextResponse.json({ error: "region_not_detected" }, { status: 400 });
  }

  const event = await prisma.event.update({
    where: { id },
    data: {
      ...(data.internalName !== undefined ? { internalName: data.internalName } : {}),
      ...(region ? { region } : {}),
      ...(data.destinationLat !== undefined ? { destinationLatEncrypted: encryptCoord(data.destinationLat) } : {}),
      ...(data.destinationLng !== undefined ? { destinationLngEncrypted: encryptCoord(data.destinationLng) } : {}),
      ...(data.revealAt !== undefined ? { revealAt: data.revealAt } : {}),
      ...(data.startsAt !== undefined ? { startsAt: data.startsAt } : {}),
      ...(data.endsAt !== undefined ? { endsAt: data.endsAt } : {}),
      ...(data.stepsCount !== undefined ? { stepsCount: data.stepsCount } : {}),
      ...(data.unlockRadiusM !== undefined ? { unlockRadiusM: data.unlockRadiusM } : {}),
      ...(data.showTotalDistance !== undefined ? { showTotalDistance: data.showTotalDistance } : {}),
      ...(data.showTotalDuration !== undefined ? { showTotalDuration: data.showTotalDuration } : {}),
      ...(data.showTollInfo !== undefined ? { showTollInfo: data.showTollInfo } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
  });

  // Closing/archiving ends live access immediately rather than waiting for
  // the retention cron — active sessions are cut off right away.
  if (data.status === "closed" || data.status === "archived") {
    await prisma.session.updateMany({
      where: { participant: { eventId: id }, status: "active" },
      data: { status: "expired" },
    });
  }

  return NextResponse.json({ event });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  await prisma.event.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
