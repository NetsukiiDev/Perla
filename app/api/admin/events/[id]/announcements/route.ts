import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/admin-guard";
import { writeAccessLog } from "@/lib/access-log";
import { AccessLogType } from "@/lib/generated/prisma/client";
import { announcementSchema, ANNOUNCEMENT_MAX_IMAGE_BYTES } from "@/lib/validation/admin-event";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const announcements = await prisma.announcement.findMany({
    where: { eventId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, title: true, message: true, createdAt: true, imageType: true },
  });

  return NextResponse.json({
    announcements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      message: a.message,
      createdAt: a.createdAt.toISOString(),
      imageUrl: a.imageType ? `/api/announcements/${a.id}/image` : null,
    })),
  });
}

function decodeDataUrl(dataUrl: string): { type: string; data: Buffer } | null {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;
  const type = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > ANNOUNCEMENT_MAX_IMAGE_BYTES) return null;
  return { type, data: buffer };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = announcementSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message;
    if (issue === "invalid_image") {
      return NextResponse.json({ error: "image_too_large" }, { status: 413 });
    }
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }

  let imageData: Buffer | null = null;
  let imageType: string | null = null;
  if (parsed.data.image) {
    const decoded = decodeDataUrl(parsed.data.image);
    if (!decoded) return NextResponse.json({ error: "image_too_large" }, { status: 413 });
    imageData = decoded.data;
    imageType = decoded.type;
  }

  const announcement = await prisma.announcement.create({
    data: {
      eventId: id,
      title: parsed.data.title,
      message: parsed.data.message,
      imageData: imageData ? new Uint8Array(imageData) : null,
      imageType,
    },
  });

  await writeAccessLog({
    type: AccessLogType.admin_action,
    eventId: id,
    metadata: { action: "Annuncio inviato", hasImage: Boolean(imageData) },
  });

  return NextResponse.json({ ok: true, id: announcement.id });
}
