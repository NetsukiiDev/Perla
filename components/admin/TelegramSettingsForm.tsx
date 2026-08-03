"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useT } from "@/lib/i18n/context";
import { Link2, Link2Off, Loader2, RefreshCw } from "lucide-react";

type Config =
  | { configured: true; hasBotToken: boolean; hasWebhookSecret: boolean; enabled: boolean }
  | { configured: false };

// Mirrors GET /api/admin/settings/telegram/webhook. Everything past hasToken
// comes from Telegram's getWebhookInfo, so it's absent when there's no token
// to ask with or when the call to Telegram itself failed.
interface WebhookStatus {
  hasToken: boolean;
  expectedUrl: string;
  botUsername?: string | null;
  registeredUrl?: string | null;
  pendingUpdateCount?: number;
  lastErrorMessage?: string | null;
}

const inputClass =
  "w-full rounded-lg border border-surface-border bg-background px-4 py-2.5 text-foreground focus:border-foreground focus:outline-none";
const labelClass = "text-xs uppercase tracking-wide text-muted";

export function TelegramSettingsForm() {
  const t = useT();
  const [cfg, setCfg] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [botToken, setBotToken] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const [webhook, setWebhook] = useState<WebhookStatus | null>(null);
  // Tracked separately from the form's `loading`: until Telegram has answered,
  // the status is unknown, and rendering the "not registered" row in the
  // meantime would state the opposite of the truth on a working setup.
  const [webhookLoading, setWebhookLoading] = useState(true);
  const [webhookBusy, setWebhookBusy] = useState<"register" | "remove" | null>(null);
  const [webhookMessage, setWebhookMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const loadWebhook = useCallback(async () => {
    setWebhookLoading(true);
    try {
      const res = await fetch("/api/admin/settings/telegram/webhook");
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setWebhook(data);
      } else {
        // The route still returns hasToken/expectedUrl on a Telegram-side
        // failure, so the panel can show the address even when the status
        // itself is unavailable.
        setWebhook(data && typeof data.expectedUrl === "string" ? data : null);
        setWebhookMessage({ ok: false, text: t.settings.telegram.webhook.errors.statusFailed });
      }
    } catch {
      setWebhookMessage({ ok: false, text: t.settings.telegram.webhook.errors.statusFailed });
    } finally {
      setWebhookLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/settings/telegram");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setCfg(data);
            if (data.configured) setEnabled(data.enabled);
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
      if (!cancelled) await loadWebhook();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadWebhook]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/settings/telegram", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken: botToken || null, webhookSecret: webhookSecret || null, enabled }),
      });
      if (res.ok) {
        setMessage({ ok: true, text: t.settings.telegram.saved });
        const tokenChanged = Boolean(botToken);
        setBotToken("");
        setWebhookSecret("");
        setCfg((prev) => ({
          configured: true,
          // The secret is generated server-side when left empty, so a save
          // with a token always ends up with one stored.
          hasBotToken: tokenChanged || (prev?.configured && prev.hasBotToken) || false,
          hasWebhookSecret: true,
          enabled,
        }));
        await loadWebhook();
      } else {
        setMessage({ ok: false, text: t.settings.telegram.errors.saveFailed });
      }
    } catch {
      setMessage({ ok: false, text: t.settings.telegram.errors.saveFailed });
    } finally {
      setSaving(false);
    }
  }

  async function handleRegister() {
    setWebhookBusy("register");
    setWebhookMessage(null);
    const w = t.settings.telegram.webhook;
    try {
      const res = await fetch("/api/admin/settings/telegram/webhook", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setWebhookMessage({ ok: true, text: w.registered });
      } else if (data?.error === "no_token") {
        setWebhookMessage({ ok: false, text: w.errors.noToken });
      } else if (data?.error === "not_public") {
        setWebhookMessage({ ok: false, text: w.errors.notPublic.replace("{url}", data.expectedUrl ?? "") });
      } else {
        setWebhookMessage({ ok: false, text: w.errors.registerFailed.replace("{error}", data?.detail ?? `HTTP ${res.status}`) });
      }
    } catch {
      setWebhookMessage({ ok: false, text: w.errors.registerFailed.replace("{error}", "network") });
    } finally {
      setWebhookBusy(null);
      await loadWebhook();
    }
  }

  async function handleRemove() {
    setWebhookBusy("remove");
    setWebhookMessage(null);
    const w = t.settings.telegram.webhook;
    try {
      const res = await fetch("/api/admin/settings/telegram/webhook", { method: "DELETE" });
      const data = await res.json().catch(() => null);
      setWebhookMessage(
        res.ok
          ? { ok: true, text: w.removed }
          : { ok: false, text: w.errors.registerFailed.replace("{error}", data?.detail ?? `HTTP ${res.status}`) },
      );
    } catch {
      setWebhookMessage({ ok: false, text: w.errors.registerFailed.replace("{error}", "network") });
    } finally {
      setWebhookBusy(null);
      await loadWebhook();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-muted" />
      </div>
    );
  }

  const w = t.settings.telegram.webhook;
  const registeredHere = Boolean(webhook?.registeredUrl && webhook.registeredUrl === webhook.expectedUrl);
  const registeredElsewhere = Boolean(webhook?.registeredUrl && webhook.registeredUrl !== webhook.expectedUrl);

  return (
    <div className="flex max-w-md flex-col gap-6">
      <form onSubmit={handleSubmit} method="post" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className={labelClass}>{t.settings.telegram.botTokenLabel}</label>
          <input
            type="password"
            className={inputClass}
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder={cfg?.configured && cfg.hasBotToken ? "••••••••" : ""}
            autoComplete="new-password"
          />
          <p className="text-xs text-muted">{t.settings.telegram.botTokenHint}</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClass}>{t.settings.telegram.webhookSecretLabel}</label>
          <input
            type="password"
            className={inputClass}
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            placeholder={cfg?.configured && cfg.hasWebhookSecret ? "••••••••" : ""}
            autoComplete="new-password"
          />
          <p className="text-xs text-muted">{t.settings.telegram.webhookSecretHint}</p>
        </div>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-surface-border accent-accent"
          />
          <span className="text-sm">{t.settings.telegram.enabledLabel}</span>
        </label>
        <p className="text-xs text-muted">{t.settings.telegram.enabledHint}</p>

        {message && <p className={`text-sm ${message.ok ? "text-emerald-400" : "text-danger"}`}>{message.text}</p>}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 self-start rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          {saving && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {saving ? t.settings.telegram.saving : t.settings.telegram.save}
        </button>
      </form>

      <div className="flex flex-col gap-3 border-t border-surface-border pt-5">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium text-foreground">{w.title}</h3>
          <p className="text-xs text-muted">{w.description}</p>
        </div>

        <div className="flex flex-col gap-1 rounded-lg border border-surface-border p-3 text-sm">
          {webhookLoading ? (
            <span className="inline-flex items-center gap-2 text-muted">
              <Loader2 size={16} className="animate-spin" aria-hidden="true" /> {t.settings.version.checking}
            </span>
          ) : (
            <span className="inline-flex items-start gap-2">
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${registeredHere ? "bg-emerald-400" : registeredElsewhere ? "bg-amber-400" : "bg-muted"}`}
                aria-hidden="true"
              />
              <span>
                {registeredHere
                  ? w.statusRegistered
                  : registeredElsewhere
                    ? w.statusOtherUrl.replace("{url}", webhook?.registeredUrl ?? "")
                    : w.statusMissing}
              </span>
            </span>
          )}
          {webhook?.botUsername && <span className="text-xs text-muted">@{webhook.botUsername}</span>}
          {webhook?.expectedUrl && (
            <span className="break-all text-xs text-muted">{w.expectedUrl.replace("{url}", webhook.expectedUrl)}</span>
          )}
          {webhook?.lastErrorMessage && (
            <span className="text-xs text-amber-400">{w.lastError.replace("{error}", webhook.lastErrorMessage)}</span>
          )}
        </div>

        {webhookMessage && (
          <p className={`text-sm ${webhookMessage.ok ? "text-emerald-400" : "text-danger"}`}>{webhookMessage.text}</p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleRegister()}
            disabled={webhookBusy !== null || webhookLoading || !webhook?.hasToken}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            {webhookBusy === "register" ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : registeredHere ? (
              <RefreshCw size={16} aria-hidden="true" />
            ) : (
              <Link2 size={16} aria-hidden="true" />
            )}
            {webhookBusy === "register" ? w.registering : w.register}
          </button>
          {(registeredHere || registeredElsewhere) && (
            <button
              type="button"
              onClick={() => void handleRemove()}
              disabled={webhookBusy !== null}
              className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-5 py-2.5 text-sm font-medium text-muted hover:text-foreground disabled:opacity-50"
            >
              {webhookBusy === "remove" ? (
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <Link2Off size={16} aria-hidden="true" />
              )}
              {webhookBusy === "remove" ? w.removing : w.remove}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
