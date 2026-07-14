"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ClipboardList,
  Download,
  ExternalLink,
  Globe,
  LayoutDashboard,
  Loader2,
  Mail,
  PanelLeft,
  RefreshCw,
  ShieldCheck,
  Tag,
  TriangleAlert,
} from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/context";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { SmtpSettingsForm } from "@/components/admin/SmtpSettingsForm";
import { SiteLogSection } from "@/components/admin/SiteLogSection";
import { TurnstileSettingsForm } from "@/components/admin/TurnstileSettingsForm";
import { useNavLayout } from "@/lib/use-nav-layout";

interface VersionInfo {
  name: string;
  version: string;
  latest: string | null;
  updateAvailable: boolean;
  checkFailed: boolean;
  commit: string | null;
  env: string;
  repoUrl: string;
}

type SettingsTab = "language" | "navLayout" | "version" | "smtp" | "turnstile" | "siteLog";

const tabIcons: Record<SettingsTab, typeof Globe> = {
  language: Globe,
  navLayout: LayoutDashboard,
  version: Tag,
  smtp: Mail,
  turnstile: ShieldCheck,
  siteLog: ClipboardList,
};

export function SettingsPanel() {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const { navLayout, setNavLayout } = useNavLayout();
  const [activeTab, setActiveTab] = useState<SettingsTab>("language");
  const [switching, setSwitching] = useState<Locale | null>(null);
  const [info, setInfo] = useState<VersionInfo | null>(null);
  const [loadingVersion, setLoadingVersion] = useState(true);

  const loadVersion = useCallback(async () => {
    setLoadingVersion(true);
    try {
      const res = await fetch("/api/admin/version");
      if (res.ok) setInfo(await res.json());
    } catch {
      /* ignore — UI shows N/A */
    } finally {
      setLoadingVersion(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/version");
        if (!cancelled && res.ok) setInfo(await res.json());
      } catch {
        /* ignore — UI shows N/A */
      } finally {
        if (!cancelled) setLoadingVersion(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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

  const [detectedLang, setDetectedLang] = useState<Locale | null>(null);

  useEffect(() => {
    const navLang = navigator.language?.toLowerCase() || "";
    // Client-only (navigator) read after mount; one-time post-hydration update,
    // not a cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDetectedLang(navLang.startsWith("it") ? "it" : navLang.startsWith("es") ? "es" : "en");
  }, []);

  const langLabels: Record<Locale, string> = {
    it: t.settings.language.italian,
    en: t.settings.language.english,
    es: t.settings.language.spanish,
  };

  const tabLabels: Record<SettingsTab, string> = {
    language: t.settings.language.section,
    navLayout: t.settings.navLayout.section,
    version: t.settings.version.section,
    smtp: t.settings.smtp.section,
    turnstile: t.settings.turnstile.section,
    siteLog: t.settings.logs.section,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-1 rounded-lg border border-surface-border bg-surface p-1">
        {(Object.keys(tabLabels) as SettingsTab[]).map((key) => {
          const Icon = tabIcons[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Icon size={16} aria-hidden="true" />
              {tabLabels[key]}
            </button>
          );
        })}
      </div>

      <div className="max-w-xl">
        {activeTab === "language" && (
          <section className="flex flex-col gap-3">
            <p className="text-sm text-muted">{t.settings.language.description}</p>
            <div className="flex flex-wrap gap-2">
              {LOCALES.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => changeLocale(l)}
                  disabled={switching !== null}
                  className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm disabled:opacity-50 ${
                    l === locale
                      ? "border-foreground bg-surface text-foreground"
                      : "border-surface-border text-muted hover:text-foreground"
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
                {detectedLang && (
                  <span className="text-xs text-muted/60">({langLabels[detectedLang]})</span>
                )}
              </button>
            </div>
          </section>
        )}

        {activeTab === "navLayout" && (
          <section className="flex flex-col gap-3">
            <p className="text-sm text-muted">{t.settings.navLayout.description}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNavLayout("horizontal")}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm ${
                  navLayout === "horizontal"
                    ? "border-foreground bg-surface text-foreground"
                    : "border-surface-border text-muted hover:text-foreground"
                }`}
              >
                <LayoutDashboard size={14} aria-hidden="true" />
                {t.settings.navLayout.horizontal}
              </button>
              <button
                type="button"
                onClick={() => setNavLayout("sidebar")}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm ${
                  navLayout === "sidebar"
                    ? "border-foreground bg-surface text-foreground"
                    : "border-surface-border text-muted hover:text-foreground"
                }`}
              >
                <PanelLeft size={14} aria-hidden="true" />
                {t.settings.navLayout.sidebar}
              </button>
            </div>
          </section>
        )}

        {activeTab === "version" && (
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-surface-border p-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">{t.settings.version.current}</p>
                <p className="font-mono text-lg font-semibold">{info ? `${info.name} v${info.version}` : "…"}</p>
              </div>
              <button
                type="button"
                onClick={() => void loadVersion()}
                disabled={loadingVersion}
                className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-sm text-muted hover:text-foreground disabled:opacity-50"
              >
                {loadingVersion ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw size={14} aria-hidden="true" />
                )}
                {loadingVersion ? t.settings.version.checking : t.settings.version.check}
              </button>
            </div>
            {info &&
              !loadingVersion &&
              (info.updateAvailable ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                  <Download size={16} className="text-amber-400" aria-hidden="true" />
                  <span>
                    <strong>{t.settings.version.available}</strong> —{" "}
                    {t.settings.version.availableTo.replace("{version}", info.latest ?? "")}
                  </span>
                  <a
                    href={`${info.repoUrl}/releases`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
                  >
                    {t.settings.version.viewOnGithub} <ExternalLink size={12} aria-hidden="true" />
                  </a>
                </div>
              ) : info.checkFailed ? (
                <div className="flex items-center gap-2 rounded-lg border border-surface-border p-3 text-sm text-muted">
                  <TriangleAlert size={16} aria-hidden="true" /> {t.settings.version.failed}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                  <Check size={16} className="text-emerald-400" aria-hidden="true" /> {t.settings.version.upToDate}
                </div>
              ))}
            <dl className="grid grid-cols-2 gap-3 rounded-lg border border-surface-border p-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">{t.settings.info.environment}</dt>
                <dd className="font-mono">{info?.env ?? t.settings.info.notAvailable}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">{t.settings.info.commit}</dt>
                <dd className="font-mono">{info?.commit ? info.commit.slice(0, 7) : t.settings.info.notAvailable}</dd>
              </div>
            </dl>
            {info && (
              <a
                href={info.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
              >
                {t.settings.version.viewOnGithub} <ExternalLink size={12} aria-hidden="true" />
              </a>
            )}
          </section>
        )}

        {activeTab === "smtp" && (
          <section className="flex flex-col gap-3">
            <p className="text-sm text-muted">{t.settings.smtp.description}</p>
            <SmtpSettingsForm />
          </section>
        )}

        {activeTab === "turnstile" && (
          <section className="flex flex-col gap-3">
            <p className="text-sm text-muted">{t.settings.turnstile.description}</p>
            <TurnstileSettingsForm />
          </section>
        )}

        {activeTab === "siteLog" && <SiteLogSection />}
      </div>
    </div>
  );
}
