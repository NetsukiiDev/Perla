"use client";

import { useState } from "react";
import { MapContainer, Marker } from "react-leaflet";
import L from "leaflet";
import { MapsTileLayer, type MapStyle } from "@/components/shared/MapsTileLayer";
import { MapStyleToggle } from "@/components/shared/MapStyleToggle";

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
  const [mapStyle, setMapStyle] = useState<MapStyle>("dark");

  return (
    <div className="relative overflow-hidden rounded-lg border border-surface-border h-[44vh] max-h-80 sm:h-[200px]">
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        style={{ height: "100%", width: "100%", touchAction: "pan-y" }}
      >
        <MapsTileLayer style={mapStyle} />
        <Marker position={[lat, lng]} icon={markerIcon} />
      </MapContainer>
      <div className="absolute right-2 top-2 z-[9999]">
        <MapStyleToggle style={mapStyle} onChange={setMapStyle} />
      </div>
    </div>
  );
}
