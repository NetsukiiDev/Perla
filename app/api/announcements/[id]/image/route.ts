import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const announcement = await prisma.announcement.findUnique({
    where: { id },
    select: { imageData: true, imageType: true },
  });

  if (!announcement || !announcement.imageData || !announcement.imageType) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(announcement.imageData as unknown as BodyInit, {
    headers: {
      "Content-Type": announcement.imageType,
      "Cache-Control": "public, max-age=3600, immutable",
    },
  });
}
