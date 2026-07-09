import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale, isLocale } from "./config";
import { getDictionary } from "./index";
import type { Dictionary } from "./types";

export { getDictionary };
export type { Dictionary };

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE)?.value;
  return raw && isLocale(raw) ? raw : DEFAULT_LOCALE;
}
