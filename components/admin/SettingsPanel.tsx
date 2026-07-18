"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  ClipboardList,
  Download,
  ExternalLink,
  Loader2,
  Mail,
  Radio,
  RefreshCw,
  ShieldCheck,
  Tag,
  TriangleAlert,
} from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { SmtpSettingsForm } from "@/components/admin/SmtpSettingsForm";
import { SiteLogSection } from "@/components/admin/SiteLogSection";
import { TurnstileSettingsForm } from "@/components/admin/TurnstileSettingsForm";
import { NgrokAdminPanel } from "@/components/admin/NgrokAdminPanel";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

type UpdateMode = "deploy-hook" | "self-update" | null;

interface VersionInfo {
  name: string;
  version: string;
  latest: string | null;
  updateAvailable: boolean;
  checkFailed: boolean;
  commit: string | null;
  env: string;
  repoUrl: string;
  updateMode: UpdateMode;
}

// This whole panel is admin-only — see app/admin/settings/page.tsx
// (requireAdminPage(["admin"])). Personal preferences (language, nav layout)
// and each user's own ngrok tunnel live on /admin/account instead, reachable
// by every role; the "ngrokAdmin" tab here is the admin's oversight view of
// everyone's tunnel, not a personal config form.
type SettingsTab = "version" | "smtp" | "turnstile" | "ngrokAdmin" | "siteLog";

const tabIcons: Record<SettingsTab, typeof Tag> = {
  version: Tag,
  smtp: Mail,
  turnstile: ShieldCheck,
  ngrokAdmin: Radio,
  siteLog: ClipboardList,
};

export function SettingsPanel() {
  const t = useT();
  const [activeTab, setActiveTab] = useState<SettingsTab>("version");
  const [info, setInfo] = useState<VersionInfo | null>(null);
  const [loadingVersion, setLoadingVersion] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ ok: boolean; text: string } | null>(null);

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

  async function triggerUpdate() {
    setUpdating(true);
    setUpdateMessage(null);
    try {
      const res = await fetch("/api/admin/update", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setUpdateMessage({ ok: true, text: t.settings.version.updateStarted });
      } else {
        setUpdateMessage({
          ok: false,
          text: t.settings.version.updateFailed.replace("{error}", data.detail ?? data.error ?? "?"),
        });
      }
    } catch {
      setUpdateMessage({ ok: false, text: t.settings.version.updateFailed.replace("{error}", "?") });
    } finally {
      setUpdating(false);
    }
  }

  const tabLabels: Record<SettingsTab, string> = {
    version: t.settings.version.section,
    smtp: t.settings.smtp.section,
    turnstile: t.settings.turnstile.section,
    ngrokAdmin: t.settings.ngrokAdmin.section,
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

      <div className={activeTab === "ngrokAdmin" ? "max-w-3xl" : "max-w-xl"}>
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
                  <div className="flex w-full flex-col gap-2 pt-1">
                    {info.updateMode ? (
                      <ConfirmButton
                        confirmMessage={(info.updateMode === "self-update"
                          ? t.settings.version.confirmSelfUpdate
                          : t.settings.version.confirmDeployHook
                        ).replace("{version}", info.latest ?? "")}
                        onConfirm={() => void triggerUpdate()}
                        disabled={updating}
                        className="inline-flex w-fit items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
                      >
                        {updating ? (
                          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                        ) : (
                          <RefreshCw size={14} aria-hidden="true" />
                        )}
                        {updating ? t.settings.version.updating : t.settings.version.update}
                      </ConfirmButton>
                    ) : (
                      <p className="text-xs text-muted">{t.settings.version.notConfigured}</p>
                    )}
                    {updateMessage && (
                      <p className={`text-sm ${updateMessage.ok ? "text-emerald-300" : "text-danger"}`}>
                        {updateMessage.text}
                      </p>
                    )}
                  </div>
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

        {activeTab === "ngrokAdmin" && (
          <section className="flex flex-col gap-3">
            <p className="text-sm text-muted">{t.settings.ngrokAdmin.description}</p>
            <NgrokAdminPanel />
          </section>
        )}

        {activeTab === "siteLog" && <SiteLogSection />}
      </div>
    </div>
  );
}
