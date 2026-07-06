"use client";

import { TileLayer } from "react-leaflet";

export type MapStyle = "dark" | "satellite";

const TILES: Record<MapStyle, { url: string; attribution: string }> = {
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap, &copy; CARTO",
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community",
  },
};

export function MapsTileLayer({ style }: { style: MapStyle }) {
  return <TileLayer {...TILES[style]} />;
}
