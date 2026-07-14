// Splits a real route polyline into N steps, evenly spaced by cumulative
// distance along the route geometry (not a straight line between origin
// and destination).
import { haversineDistanceM, type LatLng } from "@/lib/geo";

export interface RouteStepPoint {
  stepNumber: number;
  lat: number;
  lng: number;
  radiusM: number;
}

export function buildRouteSteps(
  rawPolyline: LatLng[],
  stepsCount: number,
  finalDestination: LatLng,
  unlockRadiusM: number,
  // Per-segment motorway mask aligned to the polyline (length polyline.length-1).
  // Stops that would fall on a motorway segment are shifted to the nearest
  // off-highway point so participants are never sent to stop on the highway.
  highwaySegments?: boolean[],
): RouteStepPoint[] {
  const polyline =
    rawPolyline.length >= 2 ? rawPolyline : [rawPolyline[0] ?? finalDestination, finalDestination];

  const cumulative: number[] = [0];
  for (let i = 1; i < polyline.length; i++) {
    cumulative.push(cumulative[i - 1] + haversineDistanceM(polyline[i - 1], polyline[i]));
  }
  const totalDistance = cumulative[cumulative.length - 1];
  const mask = highwaySegments && highwaySegments.length === polyline.length - 1 ? highwaySegments : undefined;

  const steps: RouteStepPoint[] = [];
  for (let i = 1; i <= stepsCount; i++) {
    const targetDistance = totalDistance * (i / stepsCount);
    const distance = mask ? offHighwayDistance(cumulative, mask, targetDistance) : targetDistance;
    const point = pointAtDistance(polyline, cumulative, distance);
    steps.push({ stepNumber: i, lat: point.lat, lng: point.lng, radiusM: unlockRadiusM });
  }

  // The last step is always exactly the event's saved destination —
  // interpolation rounding must never cause the final unlock target to
  // miss the encrypted DB value.
  steps[steps.length - 1] = {
    stepNumber: stepsCount,
    lat: finalDestination.lat,
    lng: finalDestination.lng,
    radiusM: unlockRadiusM,
  };

  return steps;
}

// Given a target distance along the route, if it lands on a motorway segment
// return the distance of the nearest NON-motorway boundary (the highway
// entrance or exit, whichever is closer); otherwise return the target unchanged.
function offHighwayDistance(cumulative: number[], mask: boolean[], targetDistance: number): number {
  const total = cumulative[cumulative.length - 1];
  const clamped = Math.max(0, Math.min(targetDistance, total));

  // Segment index containing `clamped` (0 .. mask.length-1).
  let seg = 0;
  while (seg < mask.length - 1 && cumulative[seg + 1] < clamped) seg++;

  if (!mask[seg]) return clamped;

  // Walk backward to the end of the nearest preceding non-motorway segment,
  // and forward to the start of the nearest following one.
  let back: number | null = null;
  for (let j = seg; j >= 0; j--) {
    if (!mask[j]) {
      back = cumulative[j + 1]; // boundary where the motorway begins
      break;
    }
  }
  let fwd: number | null = null;
  for (let k = seg; k < mask.length; k++) {
    if (!mask[k]) {
      fwd = cumulative[k]; // boundary where the motorway ends
      break;
    }
  }

  if (back === null && fwd === null) return clamped; // whole route is motorway
  if (back === null) return fwd as number;
  if (fwd === null) return back;
  return Math.abs(clamped - back) <= Math.abs(clamped - fwd) ? back : fwd;
}

function pointAtDistance(polyline: LatLng[], cumulative: number[], targetDistance: number): LatLng {
  if (targetDistance <= 0) return polyline[0];
  const total = cumulative[cumulative.length - 1];
  if (targetDistance >= total) return polyline[polyline.length - 1];

  let segmentIndex = 1;
  while (segmentIndex < cumulative.length && cumulative[segmentIndex] < targetDistance) {
    segmentIndex++;
  }

  const segStart = cumulative[segmentIndex - 1];
  const segEnd = cumulative[segmentIndex];
  const segLength = segEnd - segStart;
  const ratio = segLength === 0 ? 0 : (targetDistance - segStart) / segLength;

  const a = polyline[segmentIndex - 1];
  const b = polyline[segmentIndex];
  return {
    lat: a.lat + (b.lat - a.lat) * ratio,
    lng: a.lng + (b.lng - a.lng) * ratio,
  };
}
