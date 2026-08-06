"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, Shield, User, Calendar, MapPin, Key, LogIn, AlertTriangle, CheckCircle, XCircle, Globe, ChevronDown, ExternalLink } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/context";
import { ADMIN_LOG_TYPES, EVENT_LOG_TYPES } from "@/lib/log-types";

type LogCategory = "all" | "admin" | "event";
type LogSeverity = "info" | "success" | "error";

const PAGE_SIZE = 50;

// Keys already rendered inline by LogMeta — left out of the expanded raw
// dump below so the same value isn't shown twice.
const INLINE_METADATA_KEYS = new Set(["action", "email", "detail", "ip"]);

interface LogEntry {
  id: string;
  type: string;
  metadataJson: Record<string, unknown> | null;
  createdAt: string;
  eventId: string | null;
  participantId: string | null;
  actorEmail: string | null;
  event?: { internalName: string } | null;
  participant?: { displayName: string | null } | null;
}

interface AdminUserOption {
  id: string;
  email: string;
}

const categoryIcons: Record<LogCategory, typeof Shield> = {
  all: Calendar,
  admin: Shield,
  event: MapPin,
};

const typesByCategory: Record<LogCategory, readonly string[]> = {
  all: [...ADMIN_LOG_TYPES, ...EVENT_LOG_TYPES],
  admin: ADMIN_LOG_TYPES,
  event: EVENT_LOG_TYPES,
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
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [actorFilter, setActorFilter] = useState<string>("all");
  const [adminUsers, setAdminUsers] = useState<AdminUserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const reqId = useRef(0);

  function buildParams(offset: number, cat: LogCategory, type: string, actor: string): string {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (type !== "all") params.set("type", type);
    else if (cat !== "all") params.set("category", cat);
    if (actor !== "all") params.set("actor", actor);
    return params.toString();
  }

  // Populates the "filter by user" dropdown — admin-only (matches this
  // section's own visibility) but harmless to fetch alongside the logs.
  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setAdminUsers(data.users);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = ++reqId.current;
    fetch(`/api/admin/logs?${buildParams(0, category, typeFilter, actorFilter)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (id !== reqId.current || !data) return;
        setLogs(data.logs);
        setTotal(data.total);
      })
      .catch(() => {})
      .finally(() => { if (id === reqId.current) setLoading(false); });
  }, [category, typeFilter, actorFilter, reloadToken]);

  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/admin/logs?${buildParams(logs.length, category, typeFilter, actorFilter)}`);
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
    setTypeFilter("all"); // the previous exact-type filter may not exist in the new category
    setLoading(true);
  }

  function changeType(value: string) {
    if (value === typeFilter) return;
    setTypeFilter(value);
    setLoading(true);
  }

  function changeActor(value: string) {
    if (value === actorFilter) return;
    setActorFilter(value);
    setLoading(true);
  }

  function refresh() {
    setReloadToken((n) => n + 1);
    setLoading(true);
  }

  function toggleExpanded(id: string) {
    setExpandedId((current) => (current === id ? null : id));
  }

  function typeLabel(type: string): string {
    return (t.settings.logs.types as Record<string, string>)[type] ?? type;
  }

  function LogMeta({ l }: { l: LogEntry }) {
    const meta = l.metadataJson as Record<string, string | null> | null;
    const hasAnything = (meta && (meta.action || meta.email || meta.detail || meta.ip)) || l.actorEmail;
    if (!hasAnything && !l.event && !l.participant) {
      return <span className="text-xs text-muted/50">&mdash;</span>;
    }
    return (
      <>
        {meta && (meta.action || meta.email || meta.detail) && (
          <span className="text-xs text-muted">
            {meta.action}
            {meta.email && <span className="ml-1 font-mono text-[11px]">({meta.email})</span>}
            {meta.detail && <span className="ml-1">— {meta.detail}</span>}
          </span>
        )}
        {l.actorEmail && (
          <span className="flex items-center gap-1 text-xs text-muted" title={t.settings.logs.actor}>
            <User size={10} aria-hidden="true" />
            {l.actorEmail}
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
        {meta?.ip && (
          <span className="flex items-center gap-1 text-xs text-muted" title={t.settings.logs.ipAddress}>
            <Globe size={10} aria-hidden="true" />
            {meta.ip}
          </span>
        )}
      </>
    );
  }

  // Full timestamp, every other metadata field the type happens to carry
  // (raw, so a field added to a future writeAccessLog call shows up here
  // for free instead of needing a matching UI change), and links to the
  // related event/participant admin pages when there are any.
  function LogDetail({ l }: { l: LogEntry }) {
    const meta = (l.metadataJson as Record<string, unknown> | null) ?? {};
    const extraEntries = Object.entries(meta).filter(([key, value]) => !INLINE_METADATA_KEYS.has(key) && value !== null && value !== undefined);

    return (
      <div className="flex flex-col gap-2 rounded-lg bg-background/60 p-3 text-xs">
        <span className="text-muted">{new Date(l.createdAt).toLocaleString(locale)}</span>
        {extraEntries.length > 0 && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {extraEntries.map(([key, value]) => (
              <div key={key} className="contents">
                <dt className="text-muted">{key}</dt>
                <dd className="break-all font-mono text-[11px] text-foreground">{String(value)}</dd>
              </div>
            ))}
          </dl>
        )}
        {(l.eventId || l.participantId) && (
          <div className="flex flex-wrap gap-3 border-t border-surface-border pt-2">
            {l.eventId && (
              <Link href={`/admin/events/${l.eventId}`} className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300">
                {t.settings.logs.viewEvent} <ExternalLink size={11} aria-hidden="true" />
              </Link>
            )}
            {l.eventId && l.participantId && (
              <Link
                href={`/admin/events/${l.eventId}/participants/${l.participantId}`}
                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
              >
                {t.settings.logs.viewParticipant} <ExternalLink size={11} aria-hidden="true" />
              </Link>
            )}
          </div>
        )}
        <span className="font-mono text-[10px] text-muted/60">{l.id}</span>
      </div>
    );
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

      <div className="flex flex-wrap items-center gap-3">
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

        <select
          value={typeFilter}
          onChange={(e) => changeType(e.target.value)}
          className="rounded-lg border border-surface-border bg-background px-2 py-1.5 text-xs text-foreground"
        >
          <option value="all">{t.settings.logs.allTypes}</option>
          {typesByCategory[category].map((type) => (
            <option key={type} value={type}>
              {typeLabel(type)}
            </option>
          ))}
        </select>

        {adminUsers.length > 0 && (
          <select
            value={actorFilter}
            onChange={(e) => changeActor(e.target.value)}
            className="rounded-lg border border-surface-border bg-background px-2 py-1.5 text-xs text-foreground"
          >
            <option value="all">{t.settings.logs.allUsers}</option>
            {adminUsers.map((u) => (
              <option key={u.id} value={u.email}>
                {u.email}
              </option>
            ))}
          </select>
        )}
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
          {/* Mobile: one card per log entry — type/details/time in three
              table columns doesn't leave room for a long action description
              on a phone width. */}
          <div className="flex flex-col gap-2 md:hidden">
            {logs.map((l) => {
              const Icon = typeIcon(l.type);
              const severity = typeSeverity(l.type);
              const expanded = expandedId === l.id;
              return (
                <div key={l.id} className="rounded-lg border border-surface-border">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(l.id)}
                    className="flex w-full flex-col gap-1.5 p-3 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <Icon size={14} className={`shrink-0 ${severityClass[severity]}`} aria-hidden="true" />
                        {typeLabel(l.type)}
                      </span>
                      <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-muted">
                        {formatRelativeTime(l.createdAt, locale)}
                        <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <LogMeta l={l} />
                    </div>
                  </button>
                  {expanded && (
                    <div className="border-t border-surface-border p-3 pt-2">
                      <LogDetail l={l} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-lg border border-surface-border md:block">
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
                  const severity = typeSeverity(l.type);
                  const expanded = expandedId === l.id;

                  return (
                    <Fragment key={l.id}>
                      <tr
                        onClick={() => toggleExpanded(l.id)}
                        className="cursor-pointer border-b border-surface-border last:border-0 hover:bg-surface/30 transition-colors"
                      >
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                            <ChevronDown size={14} className={`shrink-0 text-muted transition-transform ${expanded ? "rotate-180" : "-rotate-90"}`} aria-hidden="true" />
                            <Icon size={14} className={`shrink-0 ${severityClass[severity]}`} aria-hidden="true" />
                            {typeLabel(l.type)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-col gap-0.5">
                            <LogMeta l={l} />
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted" title={new Date(l.createdAt).toLocaleString()}>
                          {formatRelativeTime(l.createdAt, locale)}
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="border-b border-surface-border last:border-0">
                          <td colSpan={3} className="bg-background/40 px-4 py-2">
                            <LogDetail l={l} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
