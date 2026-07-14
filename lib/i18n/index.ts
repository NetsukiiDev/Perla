import type { Dictionary } from "./types";
import { en } from "./en";
import { it } from "./it";
import { es } from "./es";
import type { Locale } from "./config";

const dictionaries: Record<Locale, Dictionary> = { it, en, es };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.it;
}
