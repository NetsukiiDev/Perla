"use client";

import { type MapStyle } from "./MapsTileLayer";

interface MapStyleToggleProps {
  style: MapStyle;
  onChange: (style: MapStyle) => void;
}

const LABELS: Record<MapStyle, { label: string; next: MapStyle; title: string }> = {
  dark: { label: "Scuro", next: "satellite", title: "Attiva satellite" },
  satellite: { label: "Satellite", next: "political", title: "Attiva politica" },
  political: { label: "Politica", next: "dark", title: "Attiva scuro" },
};

export function MapStyleToggle({ style, onChange }: MapStyleToggleProps) {
  const { label, next, title } = LABELS[style];

  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      className="rounded-md border border-surface-border bg-background px-2.5 py-1 text-xs text-muted hover:text-foreground"
      title={title}
    >
      {label}
    </button>
  );
}
