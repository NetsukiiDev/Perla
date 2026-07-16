"use client";

import { useT } from "@/lib/i18n/context";
import { timeZoneForRegion } from "@/lib/region-timezone";
import { RegionSilhouette } from "./RegionSilhouette";

function formatDateTime(iso: string, region: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timeZoneForRegion(region),
  }).format(new Date(iso));
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <span className="block text-xs uppercase tracking-wide text-muted">{label}</span>
      <span className="block truncate text-base font-medium text-foreground">{value}</span>
    </div>
  );
}

interface EventInfoGridProps {
  region: string;
  startsAt: string;
  endsAt: string | null;
}

export function EventInfoGrid({ region, startsAt, endsAt }: EventInfoGridProps) {
  const t = useT();
  return (
    <section className="flex flex-col gap-4">
      <div className={`grid ${endsAt ? "grid-cols-2" : "grid-cols-1"} gap-x-6 text-left`}>
        <InfoItem label={t.eventInfo.start} value={formatDateTime(startsAt, region)} />
        {endsAt && <InfoItem label={t.eventInfo.end} value={formatDateTime(endsAt, region)} />}
      </div>

      <div className="flex items-center justify-center gap-4 border-t border-surface-border/70 pt-4">
        <RegionSilhouette region={region} />
        <div className="text-left">
          <span className="block text-xs uppercase tracking-wide text-muted">{t.eventInfo.region}</span>
          <span className="block text-lg font-semibold text-foreground">{region}</span>
        </div>
      </div>
    </section>
  );
}
