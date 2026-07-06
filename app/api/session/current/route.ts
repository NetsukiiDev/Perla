// GET /api/session/current — returns only public-safe minimal state for
// the participant: region, timing, current step coordinates (if any).
// Used for client-side polling after the initial server-rendered load.
import { NextResponse } from "next/server";
import { resolveCurrentPublicState } from "@/lib/code-resolution";

export async function GET() {
  const state = await resolveCurrentPublicState();
  return NextResponse.json({ state });
}
