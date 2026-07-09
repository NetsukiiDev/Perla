"use client";

import { type MapStyle } from "./MapsTileLayer";
import { useT } from "@/lib/i18n/context";

interface MapStyleToggleProps {
  style: MapStyle;
  onChange: (style: MapStyle) => void;
}

export function MapStyleToggle({ style, onChange }: MapStyleToggleProps) {
  const t = useT();

  const entries: Record<MapStyle, { next: MapStyle; label: string; title: string }> = {
    dark: { next: "satellite", label: t.mapStyleToggle.satellite, title: t.mapStyleToggle.enableSatellite },
    satellite: { next: "dark", label: t.mapStyleToggle.dark, title: t.mapStyleToggle.enableDark },
  };

  const { label, next, title } = entries[style];

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
