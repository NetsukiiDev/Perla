import { it } from "./it";
import { en } from "./en";
import type { Locale } from "../config";
import type { Dictionary } from "./types";

// Client-safe: plain message objects only (no next/headers), so this can be
// imported from client components.
export const dictionaries: Record<Locale, Dictionary> = { it, en };

export type { Dictionary } from "./types";
