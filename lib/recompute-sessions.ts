// Recomputes the route + steps for the ACTIVE sessions of an event, e.g. after
// an admin changes the destination / steps count / unlock radius. Each session
// is re-routed from the participant's last known position to the new
// destination and reset to step 1, so the participant's phone reflects the new
// target on its next poll. Best-effort: sessions without a known position, or
// whose routing fails, are skipped.
import { prisma } from "@/lib/db";
import { decryptCoord, encryptCoord } from "@/lib/crypto";
import { getRouteProvider } from "@/lib/route-provider";
import { buildRouteSteps } from "@/lib/route-steps";

export async function recomputeActiveSessionsForEvent(
  eventId: string,
  destination: { lat: number; lng: number },
  stepsCount: number,
  unlockRadiusM: number,
  country?: string | null,
): Promise<{ recomputed: number; skipped: number }> {
  const sessions = await prisma.session.findMany({
    where: { participant: { eventId }, status: "active" },
    include: { locationUpdates: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  const provider = getRouteProvider();
  let recomputed = 0;
  let skipped = 0;

  for (const session of sessions) {
    const loc = session.locationUpdates[0];
    if (!loc) {
      skipped++;
      continue;
    }

    const origin = { lat: decryptCoord(loc.latEncrypted), lng: decryptCoord(loc.lngEncrypted) };

    let route;
    try {
      route = await provider.getRoute(origin, destination, country);
    } catch {
      skipped++;
      continue;
    }

    const stepPoints = buildRouteSteps(route.polyline, stepsCount, destination, unlockRadiusM, route.highwaySegments);
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.routeStep.deleteMany({ where: { sessionId: session.id } });
      await tx.routeStep.createMany({
        data: stepPoints.map((p) => ({
          sessionId: session.id,
          stepNumber: p.stepNumber,
          latEncrypted: encryptCoord(p.lat),
          lngEncrypted: encryptCoord(p.lng),
          radiusM: p.radiusM,
          unlockedAt: p.stepNumber === 1 ? now : null,
        })),
      });
      await tx.session.update({
        where: { id: session.id },
        data: {
          currentStep: 1,
          totalDistanceM: route.distanceM,
          totalDurationS: Math.round(route.durationS),
          hasHighway: route.toll?.hasHighway ?? null,
          tollEstimateCents: route.toll?.tollCents ?? null,
        },
      });
    });

    recomputed++;
  }

  return { recomputed, skipped };
}
