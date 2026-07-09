"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ExternalLink, KeyRound, Link2, MapPin, Pencil, RotateCcw, Save, Wifi } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { CopyButton } from "./CopyButton";
import { IconButton } from "./IconButton";
import { CodeStatusToggle } from "./CodeStatusToggle";
import { AccessSharePanel } from "./AccessSharePanel";
import { getDisplayStatusLabels, inviteCodeStatusLabel, type DisplayStatus } from "@/lib/status";
import { useT } from "@/lib/i18n/context";

const LiveMap = dynamic(() => import("./LiveMap").then((m) => m.LiveMap), { ssr: false });

interface Props {
  accessUrl: string | null;
  participant: {
    id: string;
    displayName: string | null;
    notes: string | null;
    code: string | null;
    codeId: string | null;
    codeStatus: string | null;
    sessionId: string | null;
    sessionStatus: string | null;
    displayStatus: DisplayStatus;
    currentStep: number | null;
    stepsCount: number;
    lastLocation: { lat: number; lng: number } | null;
    lastSeenAt: string | null;
    ipAddress: string | null;
    ipIsp: string | null;
  };
}

const inputClass =
  "w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none";
const labelClass = "text-xs uppercase tracking-wide text-muted";

export function ParticipantDetail({ accessUrl, participant: p }: Props) {
  const t = useT();
  const displayLabels = getDisplayStatusLabels(t);
  const router = useRouter();
  const [name, setName] = useState(p.displayName ?? "");
  const [notes, setNotes] = useState(p.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [revealedCode, setRevealedCode] = useState<string | null>(null);

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg(
          data?.error === "code_taken"
            ? t.participants.detail.errors.codeInUse
            : data?.error === "not_active"
              ? t.participants.detail.errors.sessionInactive
              : t.participants.detail.errors.operationFailed,
        );
        return null;
      }
      if (typeof data?.code === "string") {
        setRevealedCode(data.code);
      }
      router.refresh();
      return data;
    } finally {
      setBusy(false);
    }
  }

  async function saveInfo() {
    await call(`/api/admin/participants/${p.id}`, "PATCH", { displayName: name || null, notes: notes || null });
    setMsg(t.participants.detail.saved);
  }

  async function setCustomCode() {
    if (!p.codeId) return;
    const code = window.prompt("Nuovo codice (4-32 caratteri, lettere/numeri):");
    if (!code) return;
    await call(`/api/admin/codes/${p.codeId}`, "PATCH", { code });
  }

  async function showDestination() {
    if (!p.sessionId) return;
    await call(`/api/admin/sessions/${p.sessionId}/show-destination`, "POST");
    setMsg(t.participants.detail.errors.destinationShown);
  }

  const mapMarkers = p.lastLocation
    ? [{ id: p.id, lat: p.lastLocation.lat, lng: p.lastLocation.lng, label: p.code ?? p.displayName ?? t.participants.detail.title }]
    : [];
  const accessLink = accessUrl;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4 border-t border-surface-border pt-6">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge value={p.displayStatus} label={displayLabels[p.displayStatus]} />
          {p.currentStep && <span className="text-sm text-muted">{t.participants.detail.stepOf.replace("{current}", String(p.currentStep)).replace("{total}", String(p.stepsCount))}</span>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className={labelClass}>{t.participants.manager.username}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>{t.participants.detail.notes}</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
          </div>
        </div>
        <button
          type="button"
          onClick={saveInfo}
          disabled={busy}
          className="inline-flex items-center gap-2 self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          <Save size={16} aria-hidden="true" />
          {t.common.save}
        </button>
      </section>

      <section className="flex flex-col gap-4 border-t border-surface-border pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={labelClass}>{t.participants.detail.access.section}</span>
          {p.codeId && (
            <CodeStatusToggle
              codeId={p.codeId}
              codeStatus={p.codeStatus}
              disabled={busy}
              onChanged={() => {
                setRevealedCode(null);
                router.refresh();
              }}
            />
          )}
        </div>

        {revealedCode && (
          <div className="rounded-lg border border-accent/40 bg-accent/5 p-3">
            <p className="text-xs uppercase tracking-wide text-muted">{t.participants.detail.access.newCode}</p>
            <div className="mt-1 flex items-center gap-3">
              <span className="font-mono text-2xl tracking-widest">{revealedCode}</span>
              <CopyButton value={revealedCode} />
            </div>
          </div>
        )}

        {p.code ? (
          <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
            <div className="flex flex-col gap-2">
              <span className={labelClass}>{t.participants.detail.access.code}</span>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-2xl tracking-widest">{p.code}</span>
                <CopyButton value={p.code} />
                {p.codeStatus && <StatusBadge value={p.codeStatus} label={inviteCodeStatusLabel(p.codeStatus, t)} />}
              </div>
            </div>
            {accessLink && (
              <div className="flex min-w-0 flex-col gap-2">
                <span className={labelClass}>{t.participants.detail.access.link}</span>
                <div className="flex min-w-0 items-center gap-2">
                  <Link2 size={16} aria-hidden="true" className="shrink-0 text-muted" />
                  <a
                    href={accessLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-sm text-foreground underline underline-offset-4"
                  >
                    {accessLink}
                  </a>
                  <CopyButton value={accessLink} />
                  <a
                    href={accessLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-border text-muted hover:text-foreground"
                    title={t.participants.detail.access.openLink}
                    aria-label={t.participants.detail.access.openLink}
                  >
                    <ExternalLink size={16} aria-hidden="true" />
                    <span className="sr-only">{t.participants.detail.access.openLink}</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : p.codeId ? (
          <div className="flex flex-col gap-2 text-sm text-muted">
            <p>{t.participants.detail.access.info}</p>
            {p.codeStatus && <StatusBadge value={p.codeStatus} label={inviteCodeStatusLabel(p.codeStatus, t)} />}
          </div>
        ) : (
          <p className="text-sm text-muted">{t.participants.detail.access.noActiveCode}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {p.codeId ? (
            <>
              <IconButton
                icon={RotateCcw}
                label={t.participants.detail.access.regenerate}
                disabled={busy}
                onClick={() => call(`/api/admin/codes/${p.codeId}/regenerate`, "POST")}
              />
              <IconButton icon={Pencil} label={t.participants.detail.access.edit} disabled={busy} onClick={setCustomCode} />
            </>
          ) : (
            <IconButton
              icon={KeyRound}
              label={t.participants.detail.access.generate}
              disabled={busy}
              onClick={() => call("/api/admin/codes/generate", "POST", { participantId: p.id })}
              variant="primary"
            />
          )}
        </div>

        {p.code && accessLink && <AccessSharePanel code={p.code} accessUrl={accessLink} />}
      </section>

      <section className="flex flex-col gap-3 border-t border-surface-border pt-6">
        <div className="flex items-center gap-2">
          <Wifi size={16} aria-hidden="true" className="text-muted" />
          <span className={labelClass}>{t.participants.detail.network.section}</span>
        </div>
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <span className="block text-xs uppercase tracking-wide text-muted">{t.participants.detail.network.ip}</span>
            <span className="font-mono text-foreground">{p.ipAddress ?? t.common.na}</span>
          </div>
          <div>
            <span className="block text-xs uppercase tracking-wide text-muted">{t.participants.detail.network.isp}</span>
            <span className="text-foreground">{p.ipIsp ?? t.common.na}</span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-surface-border pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={labelClass}>{t.participants.detail.location.section}</span>
          {p.sessionId && (
            <button
              type="button"
              title={p.sessionStatus === "active" ? t.participants.detail.actions.showDestination : t.participants.detail.actions.sessionNotActive}
              onClick={showDestination}
              disabled={busy || p.sessionStatus !== "active"}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
            >
              <MapPin size={16} aria-hidden="true" />
              {t.participants.detail.actions.showDestination}
            </button>
          )}
        </div>
        {p.lastLocation ? (
          <>
            <p className="text-sm">
              {p.lastLocation.lat.toFixed(5)}, {p.lastLocation.lng.toFixed(5)}
              {p.lastSeenAt && <span className="text-muted"> - aggiornata {new Date(p.lastSeenAt).toLocaleString("it-IT")}</span>}
            </p>
            <LiveMap markers={mapMarkers} />
          </>
        ) : (
          <p className="text-sm text-muted">{t.participants.detail.location.noData}</p>
        )}
      </section>

      {msg && <p className="text-sm text-muted">{msg}</p>}

    </div>
  );
}
