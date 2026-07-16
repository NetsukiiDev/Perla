import type { SpanishRegion } from "@/lib/spanish-regions";
import { isSpanishRegion } from "@/lib/spanish-regions";
import { SPANISH_REGION_BOUNDARIES } from "@/lib/spanish-region-boundaries";
import { findRegion } from "@/lib/geo-polygon";

export function detectSpanishRegion(lat: number, lng: number): SpanishRegion | null {
  const region = findRegion(lat, lng, SPANISH_REGION_BOUNDARIES);
  return region && isSpanishRegion(region) ? region : null;
}
