import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEventAccess } from "@/lib/admin-guard";
import { writeAccessLog } from "@/lib/access-log";
import { AccessLogType } from "@/lib/generated/prisma/client";
import { announcementSchema, ANNOUNCEMENT_MAX_IMAGE_BYTES } from "@/lib/validation/admin-event";

export const runtime = "nodejs";

function decodeDataUrl(dataUrl: string): { type: string; data: Buffer } | null {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;
  const type = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > ANNOUNCEMENT_MAX_IMAGE_BYTES) return null;
  return { type, data: buffer };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; announcementId: string }> }) {
  const { id, announcementId } = await params;
  const auth = await requireEventAccess(id);
  if ("response" in auth) return auth.response;

  const existing = await prisma.announcement.findFirst({ where: { id: announcementId, eventId: id } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = announcementSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message;
    if (issue === "invalid_image") {
      return NextResponse.json({ error: "image_too_large" }, { status: 413 });
    }
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }

  // `image` absent from the body means "leave the current image untouched";
  // `null` means "remove it"; a data URL means "replace it".
  let imageUpdate: { imageData: Uint8Array<ArrayBuffer> | null; imageType: string | null } | Record<string, never> = {};
  if (parsed.data.image !== undefined) {
    if (parsed.data.image === null) {
      imageUpdate = { imageData: null, imageType: null };
    } else {
      const decoded = decodeDataUrl(parsed.data.image);
      if (!decoded) return NextResponse.json({ error: "image_too_large" }, { status: 413 });
      imageUpdate = { imageData: new Uint8Array(decoded.data) as Uint8Array<ArrayBuffer>, imageType: decoded.type };
    }
  }

  await prisma.announcement.update({
    where: { id: announcementId },
    data: {
      title: parsed.data.title,
      message: parsed.data.message,
      ...imageUpdate,
    },
  });

  await writeAccessLog({
    type: AccessLogType.admin_action,
    eventId: id,
    metadata: { action: "Annuncio modificato", detail: parsed.data.title },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; announcementId: string }> }) {
  const { id, announcementId } = await params;
  const auth = await requireEventAccess(id);
  if ("response" in auth) return auth.response;

  const existing = await prisma.announcement.findFirst({ where: { id: announcementId, eventId: id } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.announcement.delete({ where: { id: announcementId } });

  await writeAccessLog({
    type: AccessLogType.admin_action,
    eventId: id,
    metadata: { action: "Annuncio eliminato", detail: existing.title },
  });

  return NextResponse.json({ ok: true });
}
