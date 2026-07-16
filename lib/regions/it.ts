// Boundary data lives in lib/italian-region-boundaries.ts (ISTAT via
// openpolis/geojson-italy) -- kept where it is rather than moved, since it
// predates this registry and is already reviewed/tested.
import type { CountryRegions } from "./types";
import { ITALIAN_REGION_BOUNDARIES } from "@/lib/italian-region-boundaries";

export const IT: CountryRegions = {
  code: "IT",
  name: "Italy",
  regions: ITALIAN_REGION_BOUNDARIES,
};
