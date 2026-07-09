"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Activity,
  CalendarClock,
  Clock,
  Eye,
  EyeOff,
  Gauge,
  KeyRound,
  MapPin,
  Pencil,
  Radio,
  Route,
  Share2,
  type LucideIcon,
} from "lucide-react";
import { iconButtonClass } from "./IconButton";
import { useT } from "@/lib/i18n/context";

const LiveMap = dynamic(() => import("./LiveMap").then((m) => m.LiveMap), { ssr: false });

interface EventOverviewProps {
  eventId: string;
  event: {
    internalName: string;
    region: string;
    destinationLat: number;
    destinationLng: number;
    startsAt: string;
    endsAt: string | null;
    revealAt: string | null;
    stepsCount: number;
    unlockRadiusM: number;
    showTotalDistance: boolean;
    showTotalDuration: boolean;
    showTollInfo: boolean;
    notes: string | null;
  };
  stats: {
    participants: number;
    codes: number;
    activeCodes: number;
    disabledCodes: number;
    activeSessions: number;
    travelingParticipants: number;
    arrivedParticipants: number;
  };
}

function formatDateTime(value: string | null, na: string): string {
  if (!value) return na;
  return new Date(value).toLocaleString("it-IT");
}

function formatCoord(value: number): string {
  return value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

function visibleRouteData(event: EventOverviewProps["event"], t: ReturnType<typeof useT>): string {
  const values = [
    event.showTotalDistance ? t.events.overview.routeData.distance : null,
    event.showTotalDuration ? t.events.overview.routeData.duration : null,
    event.showTollInfo ? t.events.overview.routeData.toll : null,
  ].filter(Boolean);
  return values.length > 0 ? values.join(", ") : t.events.overview.routeData.hidden;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{children}</h2>;
}

function StatItem({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-border text-muted">
        <Icon size={16} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
        <p className="truncate text-lg font-semibold">{value}</p>
        <p className="truncate text-xs text-muted">{sub}</p>
      </div>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-surface-border text-muted">
        <Icon size={16} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
        <div className="mt-1 min-w-0 text-sm text-foreground">{value}</div>
      </div>
    </div>
  );
}

export function EventOverview({ eventId, event, stats }: EventOverviewProps) {
  const t = useT();
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${event.destinationLat},${event.destinationLng}`;
  const coords = `${formatCoord(event.destinationLat)}, ${formatCoord(event.destinationLng)}`;
  const [copied, setCopied] = useState(false);

  async function shareLocation() {
    const shareData = {
      title: event.internalName,
      text: `${event.internalName}\n${coords}\n${event.region}`,
      url: mapsHref,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); return; } catch { /* user cancelled */ }
    }
    if (navigator.clipboard) {
      try { await navigator.clipboard.writeText(mapsHref); } catch { /* fallback below */ }
    }
    // Fallback: copy via textarea selection
    const ta = document.createElement("textarea");
    ta.value = mapsHref;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-7">
      <section className="grid gap-x-6 gap-y-4 border-y border-surface-border py-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatItem icon={KeyRound} label={t.events.overview.stats.codes} value={stats.codes} sub={`${stats.activeCodes} attivi`} />
        <StatItem icon={EyeOff} label={t.events.overview.stats.inactive} value={stats.disabledCodes} sub="non utilizzabili" />
        <StatItem icon={Activity} label={t.events.overview.stats.live} value={stats.activeSessions} sub="sessioni attive" />
        <StatItem icon={Route} label={t.events.overview.stats.traveling} value={stats.travelingParticipants} sub="partiti non arrivati" />
        <StatItem icon={Radio} label={t.events.overview.stats.arrived} value={stats.arrivedParticipants} sub="percorso completato" />
        <StatItem icon={Route} label={t.events.overview.stats.steps} value={event.stepsCount} sub={`${event.unlockRadiusM} m raggio`} />
      </section>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <SectionTitle>{t.events.overview.sections.destination}</SectionTitle>
            <div className="flex gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={shareLocation}
                  className={iconButtonClass()}
                  title={t.events.overview.sections.share}
                  aria-label={t.events.overview.sections.share}
                >
                  <Share2 size={16} aria-hidden="true" />
                  <span className="sr-only">{t.events.overview.shareButton.share}</span>
                </button>
                {copied && (
                  <span className="absolute -top-1 right-0 whitespace-nowrap rounded-md bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground shadow animate-in fade-in slide-in-from-bottom-1">
                    {t.events.overview.copied}
                  </span>
                )}
              </div>
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className={iconButtonClass()}
                title={t.common.openInMaps}
                aria-label={t.common.openInMaps}
              >
                <MapPin size={16} aria-hidden="true" />
                <span className="sr-only">{t.common.openInMaps}</span>
              </a>
              <Link
                href={`/admin/events/${eventId}/edit`}
                className={iconButtonClass()}
                title={t.events.form.buttons.edit}
                aria-label={t.events.form.buttons.edit}
              >
                <Pencil size={16} aria-hidden="true" />
                <span className="sr-only">{t.events.form.buttons.edit}</span>
              </Link>
            </div>
          </div>

          <LiveMap
            markers={[
              {
                id: "event-location",
                lat: event.destinationLat,
                lng: event.destinationLng,
                label: `${event.internalName} - ${event.region}`,
                type: "event",
              },
            ]}
          />

          <div className="grid gap-4 pt-1 text-sm md:grid-cols-3">
            <InfoItem icon={MapPin} label={t.events.overview.sections.region} value={event.region} />
            <InfoItem icon={Gauge} label={t.events.overview.sections.coordinates} value={<span className="font-mono">{coords}</span>} />
            <InfoItem
              icon={Activity}
              label={t.events.overview.sections.tracking}
              value={
                <Link href={`/admin/events/${eventId}/live`} className="underline underline-offset-4">
                  {t.events.overview.sections.openLive}
                </Link>
              }
            />
          </div>
        </div>

        <aside className="flex flex-col gap-6">
          <section>
            <SectionTitle>{t.events.overview.sections.times}</SectionTitle>
            <div className="mt-4 grid gap-4">
              <InfoItem icon={CalendarClock} label={t.events.overview.sections.start} value={formatDateTime(event.startsAt, t.common.na)} />
              <InfoItem icon={Clock} label={t.events.overview.sections.end} value={formatDateTime(event.endsAt, t.common.na)} />
              <InfoItem icon={Radio} label={t.events.overview.sections.activation} value={formatDateTime(event.revealAt, t.common.na)} />
            </div>
          </section>

          <section className="border-t border-surface-border pt-6">
            <SectionTitle>{t.events.overview.sections.route}</SectionTitle>
            <div className="mt-4 grid gap-4">
              <InfoItem icon={Route} label={t.events.overview.sections.route} value={event.stepsCount} />
              <InfoItem icon={Gauge} label={t.events.overview.sections.unlockRadius} value={`${event.unlockRadiusM} m`} />
              <InfoItem
                icon={event.showTotalDistance || event.showTotalDuration ? Eye : EyeOff}
                label={t.events.overview.sections.shownData}
                value={visibleRouteData(event, t)}
              />
            </div>
          </section>
        </aside>
      </section>

      {event.notes && (
        <section className="border-t border-surface-border pt-6">
          <SectionTitle>{t.events.overview.sections.notes}</SectionTitle>
          <p className="mt-3 whitespace-pre-wrap text-sm text-muted">{event.notes}</p>
        </section>
      )}
    </div>
  );
}
