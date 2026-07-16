import type { ItalianRegion } from "@/lib/italian-regions";
import { isItalianRegion } from "@/lib/italian-regions";
import { ITALIAN_REGION_BOUNDARIES } from "@/lib/italian-region-boundaries";
import { findRegion } from "@/lib/geo-polygon";

export function detectItalianRegion(lat: number, lng: number): ItalianRegion | null {
  const region = findRegion(lat, lng, ITALIAN_REGION_BOUNDARIES);
  return region && isItalianRegion(region) ? region : null;
}
