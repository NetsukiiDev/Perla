"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Shield, User, Calendar, MapPin, Key, LogIn, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/context";

type LogCategory = "all" | "admin" | "event";
type LogSeverity = "info" | "success" | "error";

const PAGE_SIZE = 50;

interface LogEntry {
  id: string;
  type: string;
  metadataJson: Record<string, unknown> | null;
  createdAt: string;
  event?: { internalName: string } | null;
  participant?: { displayName: string | null } | null;
}

const categoryIcons: Record<LogCategory, typeof Shield> = {
  all: Calendar,
  admin: Shield,
  event: MapPin,
};

function typeIcon(type: string) {
  if (type.startsWith("admin_login")) return type === "admin_login_failed" ? XCircle : LogIn;
  if (type === "admin_action") return Shield;
  if (type.startsWith("password_reset")) return Key;
  if (type === "code_verify_success") return CheckCircle;
  if (type === "code_verify_invalid" || type === "code_verify_already_used" || type === "code_not_available" || type === "code_not_yet_available") return XCircle;
  if (type === "site_opened") return LogIn;
  if (type === "session_started") return User;
  if (type === "location_update") return MapPin;
  if (type === "arrived") return CheckCircle;
  if (type === "routing_error") return AlertTriangle;
  return Calendar;
}

function typeSeverity(type: string): LogSeverity {
  if (
    type === "admin_login_failed" ||
    type === "code_verify_invalid" ||
    type === "code_verify_already_used" ||
    type === "code_not_available" ||
    type === "code_not_yet_available" ||
    type === "geolocation_denied" ||
    type === "routing_error"
  ) return "error";
  if (type === "code_verify_success" || type === "password_reset_success" || type === "arrived") return "success";
  return "info";
}

const severityClass: Record<LogSeverity, string> = {
  info: "text-muted",
  success: "text-emerald-400",
  error: "text-red-400",
};

function formatRelativeTime(iso: string, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (Math.abs(diffMin) < 1) return rtf.format(0, "minute");
  if (Math.abs(diffMin) < 60) return rtf.format(-diffMin, "minute");
  const diffH = Math.round(diffMin / 60);
  if (Math.abs(diffH) < 24) return rtf.format(-diffH, "hour");
  const diffD = Math.round(diffH / 24);
  if (Math.abs(diffD) < 30) return rtf.format(-diffD, "day");
  const diffM = Math.round(diffD / 30);
  if (Math.abs(diffM) < 12) return rtf.format(-diffM, "month");
  const diffY = Math.round(diffM / 12);
  return rtf.format(-diffY, "year");
}

export function SiteLogSection() {
  const t = useT();
  const locale = useLocale();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState<LogCategory>("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const reqId = useRef(0);

  function buildParams(offset: number): string {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (category !== "all") params.set("category", category);
    return params.toString();
  }

  useEffect(() => {
    const id = ++reqId.current;
    fetch(`/api/admin/logs?${buildParams(0)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (id !== reqId.current || !data) return;
        setLogs(data.logs);
        setTotal(data.total);
      })
      .catch(() => {})
      .finally(() => { if (id === reqId.current) setLoading(false); });
  }, [category, reloadToken]);

  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/admin/logs?${buildParams(logs.length)}`);
      if (res.ok) {
        const data = await res.json();
        setLogs((prev) => [...prev, ...data.logs]);
        setTotal(data.total);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingMore(false);
    }
  }

  const categories: { key: LogCategory; label: string }[] = [
    { key: "all", label: t.settings.logs.categories.all },
    { key: "admin", label: t.settings.logs.categories.admin },
    { key: "event", label: t.settings.logs.categories.event },
  ];

  function changeCategory(key: LogCategory) {
    if (key === category) return;
    setCategory(key);
    setLoading(true);
  }

  function refresh() {
    setReloadToken((n) => n + 1);
    setLoading(true);
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Calendar size={16} className="text-muted" aria-hidden="true" /> {t.settings.logs.section}
          </h2>
          <p className="mt-1 text-sm text-muted">{t.settings.logs.description}</p>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
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

      <div className="flex gap-1 rounded-lg border border-surface-border bg-surface p-1">
        {categories.map((c) => {
          const Icon = categoryIcons[c.key];
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => changeCategory(c.key)}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                category === c.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Icon size={14} aria-hidden="true" />
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted">
        {total > 0 && <span>{total} log{total !== 1 ? "s" : ""}</span>}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" /> {t.settings.version.checking}
        </div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-muted">{t.settings.logs.empty}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-surface-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-surface-border bg-surface text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2">{t.settings.logs.table.type}</th>
                  <th className="px-4 py-2">{t.settings.logs.table.details}</th>
                  <th className="px-4 py-2">{t.settings.logs.table.time}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => {
                  const Icon = typeIcon(l.type);
                  const typeLabel = (t.settings.logs.types as Record<string, string>)[l.type] ?? l.type;
                  const meta = l.metadataJson as Record<string, string | null> | null;
                  const severity = typeSeverity(l.type);

                  return (
                    <tr key={l.id} className="border-b border-surface-border last:border-0 hover:bg-surface/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                          <Icon size={14} className={`shrink-0 ${severityClass[severity]}`} aria-hidden="true" />
                          {typeLabel}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col gap-0.5">
                          {meta && (meta.action || meta.email || meta.ip || meta.detail) && (
                            <span className="text-xs text-muted">
                              {meta.action}
                              {meta.email && <span className="ml-1 font-mono text-[11px]">({meta.email})</span>}
                              {meta.detail && <span className="ml-1">— {meta.detail}</span>}
                            </span>
                          )}
                          {l.event && (
                            <span className="flex items-center gap-1 text-xs text-muted">
                              <MapPin size={10} aria-hidden="true" />
                              {l.event.internalName}
                            </span>
                          )}
                          {l.participant && l.participant.displayName && (
                            <span className="flex items-center gap-1 text-xs text-muted">
                              <User size={10} aria-hidden="true" />
                              {l.participant.displayName}
                            </span>
                          )}
                          {!meta && !l.event && !l.participant && (
                            <span className="text-xs text-muted/50">&mdash;</span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted" title={new Date(l.createdAt).toLocaleString()}>
                        {formatRelativeTime(l.createdAt, locale)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {total > logs.length && (
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-surface-border px-4 py-2 text-sm text-muted hover:text-foreground disabled:opacity-50"
            >
              {loadingMore && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              {t.settings.logs.loadMore}
            </button>
          )}
        </>
      )}
    </section>
  );
}
