"use client";

import { type MapStyle } from "./MapsTileLayer";

interface MapStyleToggleProps {
  style: MapStyle;
  onChange: (style: MapStyle) => void;
}

const LABELS: Record<MapStyle, { next: MapStyle; label: string; title: string }> = {
  dark: { next: "satellite", label: "Satellite", title: "Attiva satellite con nomi" },
  satellite: { next: "dark", label: "Scuro", title: "Attiva scuro" },
};

export function MapStyleToggle({ style, onChange }: MapStyleToggleProps) {
  const { label, next, title } = LABELS[style];

  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      className="rounded-md border border-surface-border bg-background/80 px-2 py-0.5 text-[11px] text-muted hover:text-foreground backdrop-blur-sm"
      title={title}
    >
      {label}
    </button>
  );
}
