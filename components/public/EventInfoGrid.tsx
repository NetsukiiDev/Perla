import { RegionSilhouette } from "./RegionSilhouette";

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
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
  return (
    <section className="flex flex-col gap-4">
      <div className={`grid ${endsAt ? "grid-cols-2" : "grid-cols-1"} gap-x-6 text-left`}>
        <InfoItem label="Inizio" value={formatDateTime(startsAt)} />
        {endsAt && <InfoItem label="Fine" value={formatDateTime(endsAt)} />}
      </div>

      <div className="flex items-center justify-center gap-4 border-t border-surface-border/70 pt-4">
        <RegionSilhouette region={region} />
        <div className="text-left">
          <span className="block text-xs uppercase tracking-wide text-muted">Regione</span>
          <span className="block text-lg font-semibold text-foreground">{region}</span>
        </div>
      </div>
    </section>
  );
}
