// IANA time zone for an event's detected region (lib/detect-region.ts).
// Mostly one zone per country, but a handful of regions sit in a different
// zone than the rest of their country (e.g. the Canary Islands are WET/WEST,
// one hour behind mainland Spain; the Azores are a further hour behind
// mainland Portugal) -- REGION_TIME_ZONE_OVERRIDE covers those by exact
// region name, checked before falling back to the region's country default.
import { COUNTRIES } from "@/lib/regions";

const DEFAULT_TIME_ZONE = "Europe/Rome";

const COUNTRY_TIME_ZONE: Record<string, string> = {
  IT: "Europe/Rome",
  ES: "Europe/Madrid",
  DE: "Europe/Berlin",
  AT: "Europe/Vienna",
  PL: "Europe/Warsaw",
  NL: "Europe/Amsterdam",
  BE: "Europe/Brussels",
  CH: "Europe/Zurich",
  CZ: "Europe/Prague",
  SK: "Europe/Bratislava",
  DK: "Europe/Copenhagen",
  PT: "Europe/Lisbon",
};

const REGION_TIME_ZONE_OVERRIDE: Record<string, string> = {
  Canarias: "Atlantic/Canary",
  Açores: "Atlantic/Azores",
};

export function timeZoneForRegion(region: string | null | undefined): string {
  if (!region) return DEFAULT_TIME_ZONE;
  if (region in REGION_TIME_ZONE_OVERRIDE) return REGION_TIME_ZONE_OVERRIDE[region];

  for (const country of COUNTRIES) {
    if (country.regions.some((r) => r.name === region)) {
      return COUNTRY_TIME_ZONE[country.code] ?? DEFAULT_TIME_ZONE;
    }
  }
  return DEFAULT_TIME_ZONE;
}
