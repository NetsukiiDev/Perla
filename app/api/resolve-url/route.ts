// Resolves shortened URLs (goo.gl, etc.) by following redirects.
// Used by the event location picker to extract coordinates from Google Maps short links.
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const url: string | undefined = body?.url;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "missing_url" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json({ resolvedUrl: res.url });
  } catch {
    return NextResponse.json({ error: "resolve_failed" }, { status: 422 });
  }
}
