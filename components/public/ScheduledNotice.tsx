import { EventInfoGrid } from "./EventInfoGrid";

interface ScheduledNoticeProps {
  region: string;
  startsAt: string;
  endsAt: string | null;
  message: string;
}

export function ScheduledNotice({ region, startsAt, endsAt, message }: ScheduledNoticeProps) {
  return (
    <div className="flex flex-col gap-5 text-center">
      <EventInfoGrid region={region} startsAt={startsAt} endsAt={endsAt} />
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}
