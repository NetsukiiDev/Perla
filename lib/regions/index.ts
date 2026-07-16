import type { CountryRegions } from "./types";
import { IT } from "./it";
import { ES } from "./es";
import { DE } from "./de";
import { AT } from "./at";
import { PL } from "./pl";
import { NL } from "./nl";
import { BE } from "./be";
import { CH } from "./ch";
import { CZ } from "./cz";
import { SK } from "./sk";
import { DK } from "./dk";
import { PT } from "./pt";

// Country order doesn't affect detection (lib/detect-region.ts scores every
// match by area and keeps the smallest, so enclaves resolve correctly
// regardless of where they appear here) -- add new countries in any order.
export const COUNTRIES: CountryRegions[] = [IT, ES, DE, AT, PL, NL, BE, CH, CZ, SK, DK, PT];

// Reverse lookup: which country a stored `event.region` name belongs to
// (e.g. for lib/toll-estimate.ts's country-aware toll rules).
export function countryForRegion(region: string | null | undefined): string | null {
  if (!region) return null;
  for (const country of COUNTRIES) {
    if (country.regions.some((r) => r.name === region)) return country.code;
  }
  return null;
}

export type { CountryRegions };
