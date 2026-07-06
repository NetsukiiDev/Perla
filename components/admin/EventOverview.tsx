"use client";

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
  type LucideIcon,
} from "lucide-react";
import { iconButtonClass } from "./IconButton";

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

function formatDateTime(value: string | null): string {
  if (!value) return "N/D";
  return new Date(value).toLocaleString("it-IT");
}

function formatCoord(value: number): string {
  return value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

function visibleRouteData(event: EventOverviewProps["event"]): string {
  const values = [
    event.showTotalDistance ? "distanza totale" : null,
    event.showTotalDuration ? "tempo totale" : null,
  ].filter(Boolean);
  return values.length > 0 ? values.join(", ") : "nascosti";
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
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${event.destinationLat},${event.destinationLng}`;
  const coords = `${formatCoord(event.destinationLat)}, ${formatCoord(event.destinationLng)}`;

  return (
    <div className="flex flex-col gap-7">
      <section className="grid gap-x-6 gap-y-4 border-y border-surface-border py-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatItem icon={KeyRound} label="Codici" value={stats.codes} sub={`${stats.activeCodes} attivi`} />
        <StatItem icon={EyeOff} label="Disattivati" value={stats.disabledCodes} sub="non utilizzabili" />
        <StatItem icon={Activity} label="Live" value={stats.activeSessions} sub="sessioni attive" />
        <StatItem icon={Route} label="In viaggio" value={stats.travelingParticipants} sub="partiti non arrivati" />
        <StatItem icon={Radio} label="Arrivati" value={stats.arrivedParticipants} sub="percorso completato" />
        <StatItem icon={Route} label="Tappe" value={event.stepsCount} sub={`${event.unlockRadiusM} m raggio`} />
      </section>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <SectionTitle>Destinazione</SectionTitle>
            <div className="flex gap-2">
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className={iconButtonClass()}
                title="Apri su Maps"
                aria-label="Apri su Maps"
              >
                <MapPin size={16} aria-hidden="true" />
                <span className="sr-only">Apri su Maps</span>
              </a>
              <Link
                href={`/admin/events/${eventId}/edit`}
                className={iconButtonClass()}
                title="Modifica evento"
                aria-label="Modifica evento"
              >
                <Pencil size={16} aria-hidden="true" />
                <span className="sr-only">Modifica evento</span>
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
            <InfoItem icon={MapPin} label="Regione" value={event.region} />
            <InfoItem icon={Gauge} label="Coordinate" value={<span className="font-mono">{coords}</span>} />
            <InfoItem
              icon={Activity}
              label="Monitoraggio"
              value={
                <Link href={`/admin/events/${eventId}/live`} className="underline underline-offset-4">
                  Apri live
                </Link>
              }
            />
          </div>
        </div>

        <aside className="flex flex-col gap-6">
          <section>
            <SectionTitle>Orari</SectionTitle>
            <div className="mt-4 grid gap-4">
              <InfoItem icon={CalendarClock} label="Inizio" value={formatDateTime(event.startsAt)} />
              <InfoItem icon={Clock} label="Fine" value={formatDateTime(event.endsAt)} />
              <InfoItem icon={Radio} label="Attivazione posizioni" value={formatDateTime(event.revealAt)} />
            </div>
          </section>

          <section className="border-t border-surface-border pt-6">
            <SectionTitle>Percorso</SectionTitle>
            <div className="mt-4 grid gap-4">
              <InfoItem icon={Route} label="Tappe" value={event.stepsCount} />
              <InfoItem icon={Gauge} label="Raggio sblocco" value={`${event.unlockRadiusM} m`} />
              <InfoItem
                icon={event.showTotalDistance || event.showTotalDuration ? Eye : EyeOff}
                label="Dati mostrati"
                value={visibleRouteData(event)}
              />
            </div>
          </section>
        </aside>
      </section>

      {event.notes && (
        <section className="border-t border-surface-border pt-6">
          <SectionTitle>Note interne</SectionTitle>
          <p className="mt-3 whitespace-pre-wrap text-sm text-muted">{event.notes}</p>
        </section>
      )}
    </div>
  );
}
