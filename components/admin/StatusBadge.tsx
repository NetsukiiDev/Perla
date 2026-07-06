const TONE_CLASSES: Record<string, string> = {
  neutral: "bg-surface text-muted border-surface-border",
  positive: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  danger: "bg-danger/10 text-danger border-danger/30",
  info: "bg-sky-500/10 text-sky-400 border-sky-500/30",
};

function toneFor(value: string): keyof typeof TONE_CLASSES {
  switch (value) {
    case "active":
    case "valid":
    case "arrived":
      return "positive";
    case "scheduled":
    case "created":
    case "started":
    case "in_progress":
    case "opened_site":
      return "info";
    case "closed":
    case "archived":
    case "expired":
    case "revoked":
    case "deleted":
      return "neutral";
    case "blocked":
      return "danger";
    case "draft":
    case "not_started":
      return "warning";
    default:
      return "neutral";
  }
}

export function StatusBadge({ value, label }: { value: string; label: string }) {
  const tone = toneFor(value);
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}>
      {label}
    </span>
  );
}
