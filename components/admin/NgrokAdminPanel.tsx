"use client";

import { useEffect, useState } from "react";
import { Loader2, Radio, Square } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { CopyButton } from "@/components/admin/CopyButton";
import { StatusBadge } from "@/components/admin/StatusBadge";

const STATUS_POLL_MS = 5_000;

interface Tunnel {
  userId: string;
  email: string;
  role: "admin" | "organizer";
  hasAuthtoken: boolean;
  domain: string | null;
  running: boolean;
  url: string | null;
}

export function NgrokAdminPanel() {
  const t = useT();
  const [tunnels, setTunnels] = useState<Tunnel[] | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/admin/settings/ngrok");
      if (res.ok) {
        const data = await res.json();
        setTunnels(data.tunnels ?? []);
      }
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
    })();
    const timer = setInterval(() => {
      if (!cancelled) void load();
    }, STATUS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  async function handleStart(userId: string) {
    setError(null);
    setPending(userId);
    try {
      const res = await fetch(`/api/admin/settings/ngrok/${userId}/start`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        await load();
      } else if (data.error === "not_configured") {
        setError(t.settings.ngrok.errors.notConfigured);
      } else if (data.error === "vercel_unsupported") {
        setError(t.settings.ngrok.errors.vercelUnsupported);
      } else if (data.error === "decrypt_failed") {
        setError(t.settings.ngrok.errors.decryptFailed);
      } else if (!data.error) {
        setError(t.settings.ngrok.errors.startFailed);
      } else {
        setError(t.settings.ngrok.errors.startFailedWithDetail.replace("{error}", data.error));
      }
    } catch {
      setError(t.settings.ngrok.errors.startFailed);
    } finally {
      setPending(null);
    }
  }

  async function handleStop(userId: string) {
    setPending(userId);
    try {
      await fetch(`/api/admin/settings/ngrok/${userId}/stop`, { method: "POST" });
      await load();
    } finally {
      setPending(null);
    }
  }

  if (!tunnels) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" /> {t.settings.version.checking}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="overflow-x-auto rounded-lg border border-surface-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">{t.settings.ngrokAdmin.table.user}</th>
              <th className="px-4 py-2 font-medium">{t.settings.ngrokAdmin.table.role}</th>
              <th className="px-4 py-2 font-medium">{t.settings.ngrokAdmin.table.status}</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {tunnels.map((tunnel) => (
              <tr key={tunnel.userId}>
                <td className="px-4 py-3">{tunnel.email}</td>
                <td className="px-4 py-3">
                  <StatusBadge value={tunnel.role} label={tunnel.role === "admin" ? t.users.form.admin : t.users.form.organizer} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span className="inline-flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${tunnel.running ? "bg-emerald-400" : "bg-muted"}`} aria-hidden="true" />
                      {tunnel.running ? t.settings.ngrok.running : tunnel.hasAuthtoken ? t.settings.ngrok.stopped : t.settings.ngrokAdmin.notConfigured}
                    </span>
                    {tunnel.url && (
                      <div className="flex items-center gap-2">
                        <a href={tunnel.url} target="_blank" rel="noopener noreferrer" className="truncate text-xs text-blue-400 hover:text-blue-300">
                          {tunnel.url}
                        </a>
                        <CopyButton value={tunnel.url} />
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  {tunnel.running ? (
                    <button
                      type="button"
                      onClick={() => void handleStop(tunnel.userId)}
                      disabled={pending === tunnel.userId}
                      className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-3 py-1.5 text-xs text-muted hover:text-foreground disabled:opacity-50"
                    >
                      {pending === tunnel.userId ? (
                        <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                      ) : (
                        <Square size={12} aria-hidden="true" />
                      )}
                      {t.settings.ngrok.stop}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleStart(tunnel.userId)}
                      disabled={pending === tunnel.userId || !tunnel.hasAuthtoken}
                      className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-3 py-1.5 text-xs text-muted hover:text-foreground disabled:opacity-50"
                    >
                      {pending === tunnel.userId ? (
                        <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                      ) : (
                        <Radio size={12} aria-hidden="true" />
                      )}
                      {t.settings.ngrok.start}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
