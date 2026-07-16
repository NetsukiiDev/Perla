// Shared point-in-polygon primitives used by the per-country region detectors
// (lib/detect-italian-region.ts, lib/detect-spanish-region.ts).
export interface RegionBoundary {
  name: string;
  rings: Array<Array<[number, number]>>;
}

const EPSILON = 1e-10;

function pointOnSegment(lng: number, lat: number, a: [number, number], b: [number, number]): boolean {
  const [x1, y1] = a;
  const [x2, y2] = b;
  const cross = (lng - x1) * (y2 - y1) - (lat - y1) * (x2 - x1);
  if (Math.abs(cross) > EPSILON) return false;

  const dot = (lng - x1) * (lng - x2) + (lat - y1) * (lat - y2);
  return dot <= EPSILON;
}

export function pointInRing(lat: number, lng: number, ring: Array<[number, number]>): boolean {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const current = ring[i];
    const previous = ring[j];
    if (pointOnSegment(lng, lat, previous, current)) return true;

    const [xi, yi] = current;
    const [xj, yj] = previous;
    const intersects = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }

  return inside;
}

export function findRegion(lat: number, lng: number, boundaries: RegionBoundary[]): string | null {
  for (const region of boundaries) {
    if (region.rings.some((ring) => pointInRing(lat, lng, ring))) return region.name;
  }
  return null;
}
