// Shared point-in-polygon primitives used by lib/detect-region.ts against the
// country registry in lib/regions/.
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

// Unsigned ring area via the shoelace formula (degrees^2) -- only used to
// break ties between overlapping matches, so relative magnitude is all that
// matters.
function ringArea(ring: Array<[number, number]>): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

function boundaryArea(boundary: RegionBoundary): number {
  return boundary.rings.reduce((sum, ring) => sum + ringArea(ring), 0);
}

// Some regions are enclaves fully surrounded by another (e.g. Wien inside
// Niederösterreich, Vatican/San Marino inside Italy) -- our simplified
// boundaries drop holes, so the surrounding region's ring also (incorrectly)
// covers the enclave's area. When a point matches more than one boundary,
// the smallest-area match wins, since the enclave is always the true answer.
export function findRegion(lat: number, lng: number, boundaries: RegionBoundary[]): string | null {
  let best: { name: string; area: number } | null = null;
  for (const region of boundaries) {
    if (!region.rings.some((ring) => pointInRing(lat, lng, ring))) continue;
    const area = boundaryArea(region);
    if (!best || area < best.area) best = { name: region.name, area };
  }
  return best?.name ?? null;
}
