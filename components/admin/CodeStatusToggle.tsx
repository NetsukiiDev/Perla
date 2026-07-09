"use client";

import { useState } from "react";
import { ToggleLeft, ToggleRight } from "lucide-react";
import { useT } from "@/lib/i18n/context";

const INACTIVE_CODE_STATUSES = new Set(["revoked", "blocked", "deleted", "expired"]);

export function isCodeActive(status: string | null): boolean {
  return Boolean(status) && !INACTIVE_CODE_STATUSES.has(status ?? "");
}

export function CodeStatusToggle({
  codeId,
  codeStatus,
  disabled,
  compact = false,
  onChanged,
}: {
  codeId: string | null;
  codeStatus: string | null;
  disabled?: boolean;
  compact?: boolean;
  onChanged: () => void;
}) {
  const t = useT();
  const [pending, setPending] = useState(false);
  const active = isCodeActive(codeStatus);
  const label = active ? t.codes.statusToggle.active : t.codes.statusToggle.inactive;
  const nextLabel = active ? t.codes.statusToggle.deactivate : t.codes.statusToggle.activate;
  const Icon = active ? ToggleRight : ToggleLeft;

  async function toggle() {
    if (!codeId || pending) return;
    setPending(true);
    try {
      const res = await fetch(`/api/admin/codes/${codeId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      if (res.ok) onChanged();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      title={nextLabel}
      aria-label={nextLabel}
      aria-pressed={active}
      disabled={!codeId || disabled || pending}
      onClick={toggle}
      className={
        compact
          ? `inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${
              active
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-surface-border bg-background text-muted"
            }`
          : `inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
              active
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-surface-border bg-background text-muted"
            }`
      }
    >
      <Icon size={18} aria-hidden="true" />
      {compact ? <span className="sr-only">{label}</span> : <span>{label}</span>}
    </button>
  );
}
