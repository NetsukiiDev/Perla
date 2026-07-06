"use client";

import { Fragment } from "react";
import { TileLayer } from "react-leaflet";

export type MapStyle = "dark" | "satellite";

const TILES: Record<MapStyle, { layers: { url: string; attribution: string; maxZoom?: number }[] }> = {
  dark: {
    layers: [
      {
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attribution: "&copy; OpenStreetMap, &copy; CARTO",
      },
    ],
  },
  satellite: {
    layers: [
      {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: "&copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community",
      },
      {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        attribution: "&copy; Esri",
        maxZoom: 16,
      },
    ],
  },
};

export function MapsTileLayer({ style }: { style: MapStyle }) {
  return (
    <Fragment>
      {TILES[style].layers.map((layer, i) => (
        <TileLayer key={i} url={layer.url} attribution={layer.attribution} maxZoom={layer.maxZoom} />
      ))}
    </Fragment>
  );
}
