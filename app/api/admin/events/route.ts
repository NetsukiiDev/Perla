import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { eventCreateSchema } from "@/lib/validation/admin-event";
import { encryptCoord } from "@/lib/crypto";
import { detectItalianRegion } from "@/lib/detect-italian-region";
import { getLocale, getDictionary } from "@/lib/i18n/server";

export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const events = await prisma.event.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const locale = await getLocale();
  const t = getDictionary(locale);
  const body = await req.json().catch(() => null);
  const parsed = eventCreateSchema(t).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;
  const region = detectItalianRegion(data.destinationLat, data.destinationLng);
  if (!region) {
    return NextResponse.json({ error: "region_not_detected" }, { status: 400 });
  }

  const event = await prisma.event.create({
    data: {
      internalName: data.internalName,
      region,
      destinationLatEncrypted: encryptCoord(data.destinationLat),
      destinationLngEncrypted: encryptCoord(data.destinationLng),
      revealAt: data.revealAt ?? null,
      startsAt: data.startsAt,
      endsAt: data.endsAt ?? null,
      stepsCount: data.stepsCount,
      unlockRadiusM: data.unlockRadiusM,
      showTotalDistance: data.showTotalDistance,
      showTotalDuration: data.showTotalDuration,
      showTollInfo: data.showTollInfo,
      notes: data.notes ?? null,
      status: "draft",
    },
  });

  return NextResponse.json({ event }, { status: 201 });
}
