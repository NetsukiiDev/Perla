"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Radio, Square } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { CopyButton } from "@/components/admin/CopyButton";

const inputClass =
  "w-full rounded-lg border border-surface-border bg-background px-4 py-2.5 text-foreground focus:border-foreground focus:outline-none";
const labelClass = "text-xs uppercase tracking-wide text-muted";

const STATUS_POLL_MS = 5_000;

interface CloudflareState {
  tunnelToken: string;
  hostname: string;
}

const EMPTY: CloudflareState = { tunnelToken: "", hostname: "" };

function startErrorMessage(t: ReturnType<typeof useT>, error: string | undefined): string {
  switch (error) {
    case "vercel_unsupported":
      return t.settings.cloudflare.errors.vercelUnsupported;
    case "decrypt_failed":
      return t.settings.cloudflare.errors.decryptFailed;
    case "not_installed":
      return t.settings.cloudflare.errors.notInstalled;
    case "timeout":
      return t.settings.cloudflare.errors.timeout;
    case undefined:
      return t.settings.cloudflare.errors.startFailed;
    default:
      return t.settings.cloudflare.errors.startFailedWithDetail.replace("{error}", error);
  }
}

export function CloudflareSettingsForm() {
  const t = useT();
  const [form, setForm] = useState<CloudflareState>(EMPTY);
  const [hasTunnelToken, setHasTunnelToken] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [running, setRunning] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/account/cloudflare");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.configured) {
            setForm({ tunnelToken: "", hostname: data.hostname ?? "" });
            setHasTunnelToken(Boolean(data.hasTunnelToken));
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/admin/account/cloudflare/status");
        if (res.ok && !cancelled) {
          const data = await res.json();
          setRunning(Boolean(data.running));
          setUrl(data.url ?? null);
        }
      } catch {
        /* ignore */
      }
    }
    poll();
    const timer = setInterval(poll, STATUS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  function update<K extends keyof CloudflareState>(key: K, value: CloudflareState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setError(null);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/account/cloudflare", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tunnelToken: form.tunnelToken || null, hostname: form.hostname || null }),
      });
      if (res.ok) {
        setSaved(true);
        if (form.tunnelToken) setHasTunnelToken(true);
        setForm((prev) => ({ ...prev, tunnelToken: "" }));
      } else {
        setError(t.settings.cloudflare.errors.saveFailed);
      }
    } catch {
      setError(t.settings.cloudflare.errors.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function handleStart() {
    setError(null);
    setStarting(true);
    try {
      const res = await fetch("/api/admin/account/cloudflare/start", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setRunning(true);
        setUrl(data.url ?? null);
      } else {
        setError(startErrorMessage(t, data.error));
      }
    } catch {
      setError(t.settings.cloudflare.errors.startFailed);
    } finally {
      setStarting(false);
    }
  }

  async function handleStop() {
    setStopping(true);
    try {
      await fetch("/api/admin/account/cloudflare/stop", { method: "POST" });
    } finally {
      setRunning(false);
      setUrl(null);
      setStopping(false);
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" /> {t.settings.version.checking}
      </div>
    );
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className={labelClass}>{t.settings.cloudflare.tunnelTokenLabel}</label>
          <input
            type="password"
            className={inputClass}
            value={form.tunnelToken}
            onChange={(e) => update("tunnelToken", e.target.value)}
            placeholder={hasTunnelToken ? "••••••••" : ""}
            autoComplete="new-password"
          />
          <p className="text-xs text-muted">{t.settings.cloudflare.tunnelTokenHint}</p>
          <a
            href="https://one.dash.cloudflare.com/?to=/:account/networks/tunnels"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {t.settings.cloudflare.tunnelTokenLinkLabel}
          </a>
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass}>{t.settings.cloudflare.hostnameLabel}</label>
          <input
            className={inputClass}
            value={form.hostname}
            onChange={(e) => update("hostname", e.target.value)}
            placeholder={t.settings.cloudflare.hostnamePlaceholder}
          />
          <p className="text-xs text-muted">{t.settings.cloudflare.hostnameHint}</p>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {saved && <p className="text-sm text-emerald-400">{t.settings.cloudflare.saved}</p>}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 self-start rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          {saving && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {saving ? t.settings.cloudflare.saving : t.settings.cloudflare.save}
        </button>
      </form>

      <div className="flex flex-col gap-3 rounded-lg border border-surface-border p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-sm">
            <span className={`h-2 w-2 rounded-full ${running ? "bg-emerald-400" : "bg-muted"}`} aria-hidden="true" />
            {running ? t.settings.cloudflare.running : t.settings.cloudflare.stopped}
          </span>
          {running ? (
            <button
              type="button"
              onClick={handleStop}
              disabled={stopping}
              className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-4 py-2 text-sm text-muted hover:text-foreground disabled:opacity-50"
            >
              {stopping ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Square size={14} aria-hidden="true" />}
              {stopping ? t.settings.cloudflare.stopping : t.settings.cloudflare.stop}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStart}
              disabled={starting}
              className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-4 py-2 text-sm text-muted hover:text-foreground disabled:opacity-50"
            >
              {starting ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Radio size={14} aria-hidden="true" />}
              {starting ? t.settings.cloudflare.starting : t.settings.cloudflare.start}
            </button>
          )}
        </div>
        {!hasTunnelToken && <p className="text-xs text-muted">{t.settings.cloudflare.quickTunnelHint}</p>}
        {url && (
          <div className="flex flex-col gap-1">
            <span className={labelClass}>{t.settings.cloudflare.urlLabel}</span>
            <div className="flex items-center gap-2">
              <a href={url} target="_blank" rel="noopener noreferrer" className="truncate text-sm text-blue-400 hover:text-blue-300">
                {url}
              </a>
              <CopyButton value={url} />
            </div>
            <p className="text-xs text-muted">{t.settings.cloudflare.shareHint}</p>
          </div>
        )}
      </div>
    </div>
  );
}
