"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Globe, LayoutDashboard, Loader2, PanelLeft } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/context";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { useNavLayout } from "@/lib/use-nav-layout";

// Personal preferences (not admin config) — reachable by every role, unlike
// the rest of /admin/settings which is admin-only. Moved out of
// SettingsPanel so organizers keep access to their own language/layout.
export function PreferencesPanel() {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const { navLayout, setNavLayout } = useNavLayout();
  const [switching, setSwitching] = useState<Locale | null>(null);
  const [detectedLang, setDetectedLang] = useState<Locale | null>(null);

  useEffect(() => {
    const navLang = navigator.language?.toLowerCase() || "";
    // Client-only (navigator) read after mount; one-time post-hydration update,
    // not a cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDetectedLang(LOCALES.find((l) => l !== "en" && navLang.startsWith(l)) ?? "en");
  }, []);

  async function changeLocale(next: Locale) {
    if (next === locale) return;
    setSwitching(next);
    try {
      await fetch("/api/settings/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      router.refresh();
    } finally {
      setSwitching(null);
    }
  }

  const langLabels: Record<Locale, string> = {
    it: t.settings.language.italian,
    en: t.settings.language.english,
    es: t.settings.language.spanish,
    fr: t.settings.language.french,
    de: t.settings.language.german,
    pt: t.settings.language.portuguese,
    nl: t.settings.language.dutch,
    pl: t.settings.language.polish,
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">{t.settings.language.section}</h2>
        <p className="text-sm text-muted">{t.settings.language.description}</p>
        <div className="flex flex-wrap gap-2">
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => changeLocale(l)}
              disabled={switching !== null}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm disabled:opacity-50 ${
                l === locale ? "border-foreground bg-surface text-foreground" : "border-surface-border text-muted hover:text-foreground"
              }`}
            >
              {switching === l ? (
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              ) : l === locale ? (
                <Check size={14} aria-hidden="true" />
              ) : null}
              {langLabels[l]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => detectedLang && changeLocale(detectedLang)}
            disabled={switching !== null || !detectedLang}
            className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-4 py-2 text-sm text-muted hover:text-foreground disabled:opacity-50"
            title={detectedLang ? `${t.settings.language.auto} (${langLabels[detectedLang]})` : "…"}
          >
            <Globe size={14} aria-hidden="true" />
            {t.settings.language.auto}
            {detectedLang && <span className="text-xs text-muted/60">({langLabels[detectedLang]})</span>}
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">{t.settings.navLayout.section}</h2>
        <p className="text-sm text-muted">{t.settings.navLayout.description}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setNavLayout("horizontal")}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm ${
              navLayout === "horizontal" ? "border-foreground bg-surface text-foreground" : "border-surface-border text-muted hover:text-foreground"
            }`}
          >
            <LayoutDashboard size={14} aria-hidden="true" />
            {t.settings.navLayout.horizontal}
          </button>
          <button
            type="button"
            onClick={() => setNavLayout("sidebar")}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm ${
              navLayout === "sidebar" ? "border-foreground bg-surface text-foreground" : "border-surface-border text-muted hover:text-foreground"
            }`}
          >
            <PanelLeft size={14} aria-hidden="true" />
            {t.settings.navLayout.sidebar}
          </button>
        </div>
      </section>
    </div>
  );
}
