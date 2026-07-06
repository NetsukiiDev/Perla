"use client";

import dynamic from "next/dynamic";
import { EventInfoGrid } from "./EventInfoGrid";
import { OpenLocationButton } from "./OpenLocationButton";

const InlineMap = dynamic(() => import("./InlineMap").then((m) => m.InlineMap), { ssr: false });

function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function formatDuration(s: number): string {
  const minutes = Math.round(s / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours} h ${rem} min` : `${hours} h`;
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="block text-xs uppercase tracking-wide text-muted">{label}</span>
      <span className="block truncate font-medium text-foreground">{value}</span>
    </div>
  );
}

interface ParticipantStepViewProps {
  region: string;
  startsAt: string;
  endsAt: string | null;
  stepIndex: number;
  stepsCount: number;
  lat: number;
  lng: number;
  totalDistanceM?: number;
  totalDurationS?: number;
  stepDistanceM?: number;
  stepDurationS?: number;
  hint: string;
}

export function ParticipantStepView({
  region,
  startsAt,
  endsAt,
  stepIndex,
  stepsCount,
  lat,
  lng,
  totalDistanceM,
  totalDurationS,
  stepDistanceM,
  stepDurationS,
  hint,
}: ParticipantStepViewProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold">Posizione {stepIndex} di {stepsCount}</h1>
      </div>

      <InlineMap lat={lat} lng={lng} />

      <EventInfoGrid region={region} startsAt={startsAt} endsAt={endsAt} />

      {(stepDistanceM !== undefined ||
        stepDurationS !== undefined ||
        totalDistanceM !== undefined ||
        totalDurationS !== undefined) && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-surface-border/70 pt-4 text-left text-sm">
          <MetricItem label="Distanza tappa" value={stepDistanceM !== undefined ? formatDistance(stepDistanceM) : "N/D"} />
          <MetricItem label="Tempo tappa" value={stepDurationS !== undefined ? formatDuration(stepDurationS) : "N/D"} />
          <MetricItem
            label="Distanza totale"
            value={totalDistanceM !== undefined ? formatDistance(totalDistanceM) : "N/D"}
          />
          <MetricItem label="Tempo totale" value={totalDurationS !== undefined ? formatDuration(totalDurationS) : "N/D"} />
        </div>
      )}

      <OpenLocationButton lat={lat} lng={lng} />

      <p className="text-center text-sm text-muted">{hint}</p>
    </div>
  );
}
