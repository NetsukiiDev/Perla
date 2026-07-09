import type { Dictionary } from "./types";
import { en } from "./en";
import { it } from "./it";
import type { Locale } from "./config";

const dictionaries: Record<Locale, Dictionary> = { it, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.it;
}
