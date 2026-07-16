// Boundary data lives in lib/spanish-region-boundaries.ts (click_that_hood) --
// kept where it is rather than moved, since it predates this registry and is
// already reviewed/tested.
import type { CountryRegions } from "./types";
import { SPANISH_REGION_BOUNDARIES } from "@/lib/spanish-region-boundaries";

export const ES: CountryRegions = {
  code: "ES",
  name: "Spain",
  regions: SPANISH_REGION_BOUNDARIES,
};
