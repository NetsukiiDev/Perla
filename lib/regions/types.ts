import type { RegionBoundary } from "@/lib/geo-polygon";

export interface CountryRegions {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  regions: RegionBoundary[];
}
