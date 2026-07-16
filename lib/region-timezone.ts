// IANA time zone for an event's detected region (lib/detect-region.ts). Needed
// because not every supported region shares the same UTC offset: the Canary
// Islands (Canarias) are on WET/WEST, one hour behind mainland Spain and
// Italy, so participant-facing times must resolve per region rather than
// assume a single zone.
import { SPANISH_REGIONS } from "@/lib/spanish-regions";

const CANARIAS_TIME_ZONE = "Atlantic/Canary";
const SPAIN_TIME_ZONE = "Europe/Madrid";
const ITALY_TIME_ZONE = "Europe/Rome";

const SPANISH_REGION_NAMES = new Set<string>(SPANISH_REGIONS);

export function timeZoneForRegion(region: string | null | undefined): string {
  if (region === "Canarias") return CANARIAS_TIME_ZONE;
  if (region && SPANISH_REGION_NAMES.has(region)) return SPAIN_TIME_ZONE;
  return ITALY_TIME_ZONE;
}
