"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useT } from "@/lib/i18n/context";

interface LogEntry {
  id: string;
  type: string;
  metadataJson: Record<string, unknown> | null;
  createdAt: string;
}

export function SiteLogSection() {
  const t = useT();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const cancelledRef = useRef(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/logs?limit=50");
      if (!cancelledRef.current && res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch {
      /* ignore */
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    cancelledRef.current = false;
    load();
    return () => { cancelledRef.current = true; };
  }, []);

  return (
    <section className="flex flex-col gap-3 border-t border-surface-border pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">{t.settings.logs.section}</h2>
          <p className="mt-1 text-sm text-muted">{t.settings.logs.description}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-sm text-muted hover:text-foreground disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw size={14} aria-hidden="true" />
          )}
          {t.settings.version.check}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" /> {t.settings.version.checking}
        </div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-muted">{t.settings.logs.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-surface-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-surface-border bg-surface text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2">{t.settings.logs.table.type}</th>
                <th className="px-4 py-2">{t.settings.logs.table.time}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-surface-border last:border-0">
                  <td className="px-4 py-2 font-mono text-xs">{l.type}</td>
                  <td className="px-4 py-2 text-muted">{new Date(l.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {total > logs.length && (
            <p className="px-4 py-2 text-xs text-muted">{t.settings.logs.more.replace("{count}", String(total - logs.length))}</p>
          )}
        </div>
      )}
    </section>
  );
}
