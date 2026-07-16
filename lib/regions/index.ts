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
import { FR } from "./fr";
import { GB } from "./gb";
import { NO } from "./no";
import { SE } from "./se";
import { FI } from "./fi";
import { IS } from "./is";
import { LT } from "./lt";
import { EE } from "./ee";
import { LV } from "./lv";
import { HR } from "./hr";
import { BG } from "./bg";
import { RO } from "./ro";
import { RS } from "./rs";
import { BA } from "./ba";
import { ME } from "./me";
import { MK } from "./mk";
import { AL } from "./al";
import { XK } from "./xk";
import { UA } from "./ua";
import { BY } from "./by";
import { MD } from "./md";
import { GE } from "./ge";
import { AM } from "./am";
import { AZ } from "./az";
import { AD } from "./ad";
import { MC } from "./mc";
import { SM } from "./sm";
import { VA } from "./va";
import { LI } from "./li";
import { MT } from "./mt";
import { CY } from "./cy";
import { LU } from "./lu";
import { RU } from "./ru";
import { TR } from "./tr";

// Country order doesn't affect detection (lib/detect-region.ts scores every
// match by area and keeps the smallest, so enclaves resolve correctly
// regardless of where they appear here) -- add new countries in any order.
export const COUNTRIES: CountryRegions[] = [
  IT, ES, DE, AT, PL, NL, BE, CH, CZ, SK, DK, PT,
  FR, GB, NO, SE, FI, IS, LT, EE, LV, HR, BG, RO, RS, BA, ME, MK, AL, XK,
  UA, BY, MD, GE, AM, AZ, AD, MC, SM, VA, LI, MT, CY, LU, RU, TR,
];

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
