"use client";

import { useLocale, useT } from "@/lib/i18n/context";
import { timeZoneForRegion } from "@/lib/region-timezone";
import { countryForRegion } from "@/lib/regions";
import { RegionSilhouette } from "./RegionSilhouette";

// Derived from the ISO country code via the platform's own locale data
// instead of a hand-maintained translation table (would mean 47 countries x
// 8 languages to keep in sync).
function countryDisplayName(countryCode: string, locale: string): string | null {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(countryCode) ?? null;
  } catch {
    return null;
  }
}

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
  const locale = useLocale();
  const countryCode = countryForRegion(region);
  const countryName = countryCode ? countryDisplayName(countryCode, locale) : null;

  return (
    <section className="flex flex-col gap-4">
      <div className={`grid ${endsAt ? "grid-cols-2" : "grid-cols-1"} gap-x-6 text-left`}>
        <InfoItem label={t.eventInfo.start} value={formatDateTime(startsAt, region)} />
        {endsAt && <InfoItem label={t.eventInfo.end} value={formatDateTime(endsAt, region)} />}
      </div>

      <div className="flex items-center justify-center gap-4 border-t border-surface-border/70 pt-4">
        <RegionSilhouette region={region} />
        <div className="flex flex-col gap-2 text-left">
          {countryName && (
            <div>
              <span className="block text-xs uppercase tracking-wide text-muted">{t.eventInfo.country}</span>
              <span className="block text-base font-medium text-foreground">{countryName}</span>
            </div>
          )}
          <div>
            <span className="block text-xs uppercase tracking-wide text-muted">{t.eventInfo.region}</span>
            <span className="block text-lg font-semibold text-foreground">{region}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
