"use client";

import { useState } from "react";
import { MapContainer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { MapsTileLayer, type MapStyle } from "@/components/shared/MapsTileLayer";
import { MapStyleToggle } from "@/components/shared/MapStyleToggle";

interface MarkerData {
  id: string;
  lat: number;
  lng: number;
  label: string;
  type?: "participant" | "event";
}

function iconFor(type: "participant" | "event" = "participant") {
  const color = type === "event" ? "#7dd3fc" : "#e8e8ec";
  const size = type === "event" ? 18 : 12;
  const radius = type === "event" ? 4 : 9999;
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:${radius}px;background:${color};box-shadow:0 0 0 4px ${color}33;border:2px solid #0a0a0b;"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Admin-only: receives already-decrypted coordinates from the /live API
// response. Never used on any participant-facing surface.
export function LiveMap({ markers }: { markers: MarkerData[] }) {
  const [mapStyle, setMapStyle] = useState<MapStyle>("dark");
  const center: [number, number] = markers.length > 0 ? [markers[0].lat, markers[0].lng] : [41.9, 12.5];
  const zoom = markers.length > 1 ? 10 : 14;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <MapStyleToggle style={mapStyle} onChange={setMapStyle} />
      </div>
      <div className="overflow-hidden rounded-lg border border-surface-border" style={{ height: 320 }}>
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <MapsTileLayer style={mapStyle} />
          {markers.map((m) => (
            <Marker key={m.id} position={[m.lat, m.lng]} icon={iconFor(m.type)}>
              <Popup>{m.label}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
