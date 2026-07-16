// Country-agnostic entry point for event-destination region detection. The
// stored `region` name alone is enough downstream (names don't collide
// across countries), so callers don't need to track which country matched.
import { findRegion } from "@/lib/geo-polygon";
import { COUNTRIES } from "@/lib/regions";

export function detectRegion(lat: number, lng: number): string | null {
  const allRegions = COUNTRIES.flatMap((country) => country.regions);
  return findRegion(lat, lng, allRegions);
}
