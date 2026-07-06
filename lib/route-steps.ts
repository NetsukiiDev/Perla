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
): RouteStepPoint[] {
  const polyline =
    rawPolyline.length >= 2 ? rawPolyline : [rawPolyline[0] ?? finalDestination, finalDestination];

  const cumulative: number[] = [0];
  for (let i = 1; i < polyline.length; i++) {
    cumulative.push(cumulative[i - 1] + haversineDistanceM(polyline[i - 1], polyline[i]));
  }
  const totalDistance = cumulative[cumulative.length - 1];

  const steps: RouteStepPoint[] = [];
  for (let i = 1; i <= stepsCount; i++) {
    const targetDistance = totalDistance * (i / stepsCount);
    const point = pointAtDistance(polyline, cumulative, targetDistance);
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
