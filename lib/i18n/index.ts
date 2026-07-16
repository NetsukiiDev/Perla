import type { Dictionary } from "./types";
import { en } from "./en";
import { it } from "./it";
import { es } from "./es";
import { fr } from "./fr";
import { de } from "./de";
import { pt } from "./pt";
import { nl } from "./nl";
import { pl } from "./pl";
import type { Locale } from "./config";

const dictionaries: Record<Locale, Dictionary> = { it, en, es, fr, de, pt, nl, pl };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.it;
}
