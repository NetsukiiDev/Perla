"use client";

import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";

const markerIcon = L.divIcon({
  className: "",
  html: '<div style="width:14px;height:14px;border-radius:9999px;background:#e8e8ec;box-shadow:0 0 0 6px rgba(232,232,236,0.25);"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

interface InlineMapProps {
  lat: number;
  lng: number;
}

// Single marker only — the current step. Never receives or renders any
// other waypoint.
export function InlineMap({ lat, lng }: InlineMapProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-surface-border" style={{ height: 180 }}>
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <Marker position={[lat, lng]} icon={markerIcon} />
      </MapContainer>
    </div>
  );
}
