"use client";

import { useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/context";
import { CopyButton } from "@/components/admin/CopyButton";

interface ApiKeyStatus {
  configured: boolean;
  createdAt: string | null;
  lastUsedAt: string | null;
}

export function ApiKeyForm() {
  const t = useT();
  const locale = useLocale();
  const [status, setStatus] = useState<ApiKeyStatus | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Inline two-step confirmation instead of window.confirm() — native
  // dialogs are unreliable across browsers/embedded webviews and can be
  // silently auto-dismissed, which made regeneration look broken.
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/account/api-key");
        if (res.ok && !cancelled) setStatus(await res.json());
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleGenerate() {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/account/api-key", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setNewKey(data.key);
        setStatus({ configured: true, createdAt: new Date().toISOString(), lastUsedAt: null });
        setConfirmingRegenerate(false);
      } else {
        setError(t.account.apiKey.errors.generateFailed);
      }
    } catch {
      setError(t.account.apiKey.errors.generateFailed);
    } finally {
      setGenerating(false);
    }
  }

  if (!status) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" /> {t.settings.version.checking}
      </div>
    );
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      {newKey ? (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-sm font-medium text-amber-200">{t.account.apiKey.revealWarning}</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-foreground">
              {newKey}
            </code>
            <CopyButton value={newKey} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1 rounded-lg border border-surface-border p-3 text-sm">
          <span className="inline-flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${status.configured ? "bg-emerald-400" : "bg-muted"}`} aria-hidden="true" />
            {status.configured ? t.account.apiKey.configured : t.account.apiKey.notConfigured}
          </span>
          {status.configured && (
            <span className="text-xs text-muted">
              {status.lastUsedAt
                ? t.account.apiKey.lastUsed.replace("{date}", new Date(status.lastUsedAt).toLocaleString(locale))
                : t.account.apiKey.neverUsed}
            </span>
          )}
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {status.configured ? (
        confirmingRegenerate ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-danger">{t.account.apiKey.confirmRegenerate}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={generating}
                className="inline-flex items-center gap-2 rounded-lg bg-danger px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {generating ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <KeyRound size={16} aria-hidden="true" />}
                {generating ? t.account.apiKey.generating : t.account.apiKey.confirmRegenerateButton}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingRegenerate(false)}
                disabled={generating}
                className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-5 py-2.5 text-sm font-medium text-muted hover:text-foreground disabled:opacity-50"
              >
                {t.common.cancel}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingRegenerate(true)}
            className="inline-flex items-center gap-2 self-start rounded-lg border border-surface-border px-5 py-2.5 text-sm font-medium text-muted hover:text-foreground disabled:opacity-50"
          >
            <KeyRound size={16} aria-hidden="true" />
            {t.account.apiKey.regenerate}
          </button>
        )
      ) : (
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={generating}
          className="inline-flex items-center gap-2 self-start rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          {generating ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <KeyRound size={16} aria-hidden="true" />}
          {generating ? t.account.apiKey.generating : t.account.apiKey.generate}
        </button>
      )}
    </div>
  );
}
