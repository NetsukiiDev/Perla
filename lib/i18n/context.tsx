"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { getDictionary } from "./index";
import type { Dictionary } from "./types";

export type { Dictionary };

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT(): Dictionary {
  const locale = useLocale();
  return useMemo(() => getDictionary(locale), [locale]);
}
