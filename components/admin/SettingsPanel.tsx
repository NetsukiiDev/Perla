"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Download, ExternalLink, Globe, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/context";
import { LOCALES, type Locale } from "@/lib/i18n/config";

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

export function SettingsPanel() {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
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

  // Load on mount without a synchronous setState in the effect body: state is
  // updated only after the fetch resolves. `loadingVersion` already starts true.
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

  const langLabels: Record<Locale, string> = {
    it: t.settings.language.italian,
    en: t.settings.language.english,
  };

  return (
    <div className="flex max-w-xl flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Globe size={16} className="text-muted" aria-hidden="true" /> {t.settings.language.section}
          </h2>
          <p className="mt-1 text-sm text-muted">{t.settings.language.description}</p>
        </div>
        <div className="flex gap-2">
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
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-surface-border pt-6">
        <h2 className="text-sm font-semibold">{t.settings.version.section}</h2>
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
      </section>

      <section className="flex flex-col gap-3 border-t border-surface-border pt-6">
        <h2 className="text-sm font-semibold">{t.settings.info.section}</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
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
    </div>
  );
}
