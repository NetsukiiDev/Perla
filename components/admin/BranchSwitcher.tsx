"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CircleDot, GitBranch, Loader2, RefreshCw } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/context";

interface Branch {
  name: string;
  sha: string;
  current: boolean;
  // null for every branch except the one checked out — there's nothing local
  // to compare the others against.
  upToDate: boolean | null;
}

type BranchState =
  | { available: false }
  | {
      available: true;
      current: string;
      currentSha: string;
      branches: Branch[];
      source: "github" | "local";
      fetchedAt: number;
      error: string | null;
    };

// Long enough that an admin watching the tab sees a branch pushed from
// elsewhere appear on its own, short enough to feel live. The GitHub call
// behind it is cached server-side, so this cadence costs nothing extra.
const POLL_MS = 20_000;

export function BranchSwitcher() {
  const t = useT();
  const locale = useLocale();
  const [state, setState] = useState<BranchState | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  // Polling must not fight a switch in progress: a refresh landing mid-checkout
  // would redraw the list under the button the admin just pressed.
  const busy = useRef(false);

  const load = useCallback(async (force = false) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const res = await fetch(`/api/admin/branch${force ? "?refresh=1" : ""}`);
      if (res.ok) setState(await res.json());
    } catch {
      /* keep the previous list: a dropped poll isn't worth blanking the panel */
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
    })();
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  async function switchTo(branch: string) {
    setSwitching(branch);
    setMessage(null);
    busy.current = true;
    try {
      const res = await fetch("/api/admin/branch", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch }),
      });
      const data = await res.json().catch(() => ({}));
      setMessage(
        res.ok
          ? { ok: true, text: t.settings.branch.switched.replace("{branch}", branch) }
          : { ok: false, text: t.settings.branch.switchFailed.replace("{error}", data.error ?? `HTTP ${res.status}`) },
      );
    } catch {
      // In production a successful switch rebuilds and exits, so the request
      // can die with the server — which from here is indistinguishable from a
      // network failure, and saying "failed" would be a lie.
      setMessage({ ok: true, text: t.settings.branch.switchedRestarting });
    } finally {
      setSwitching(null);
      busy.current = false;
      void load(true);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" /> {t.settings.version.checking}
      </div>
    );
  }

  if (!state?.available) {
    return <p className="text-xs text-muted">{t.settings.branch.unavailable}</p>;
  }

  const others = state.branches.filter((b) => !b.current);
  const currentBranch = state.branches.find((b) => b.current);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-surface-border p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-xs uppercase tracking-wide text-muted">{t.settings.branch.current}</span>
          <span className="inline-flex items-center gap-2 font-mono font-semibold">
            <GitBranch size={14} aria-hidden="true" />
            {state.current}
          </span>
          <span className="font-mono text-xs text-muted">{state.currentSha.slice(0, 7)}</span>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={switching !== null}
          title={t.settings.branch.refresh}
          aria-label={t.settings.branch.refresh}
          className="rounded-lg border border-surface-border p-2 text-muted hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw size={14} aria-hidden="true" />
        </button>
      </div>

      {currentBranch?.upToDate === false && (
        <p className="text-xs text-amber-400">
          {t.settings.branch.differs.replace("{sha}", currentBranch.sha.slice(0, 7))}
        </p>
      )}

      {others.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {others.map((b) => (
            <button
              key={b.name}
              type="button"
              disabled={switching !== null}
              onClick={() => void switchTo(b.name)}
              className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-3 py-1.5 text-sm text-muted hover:text-foreground disabled:opacity-50"
            >
              {switching === b.name ? (
                <Loader2 size={12} className="animate-spin" aria-hidden="true" />
              ) : (
                <CircleDot size={12} aria-hidden="true" />
              )}
              <span className="font-mono">{b.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted">{t.settings.branch.onlyOne}</p>
      )}

      {switching && <p className="text-xs text-muted">{t.settings.branch.switching.replace("{branch}", switching)}</p>}
      {message && <p className={`text-sm ${message.ok ? "text-emerald-300" : "text-danger"}`}>{message.text}</p>}

      <p className="text-xs text-muted">
        {state.source === "github"
          ? t.settings.branch.fromGithub.replace("{time}", new Date(state.fetchedAt).toLocaleTimeString(locale))
          : t.settings.branch.fromLocal}
      </p>
    </div>
  );
}
