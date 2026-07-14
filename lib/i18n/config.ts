export const LOCALES = ["it", "en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_COOKIE = "locale";

export function isLocale(v: unknown): v is Locale {
  return LOCALES.includes(v as Locale);
}

export const DEFAULT_LOCALE: Locale = "it";
