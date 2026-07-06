"use client";

import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

const DEFAULT_CENTER: [number, number] = [42.5, 12.5];

const markerIcon = L.divIcon({
  className: "",
  html: '<div style="width:16px;height:16px;border-radius:9999px;background:#e8e8ec;box-shadow:0 0 0 6px rgba(232,232,236,0.25);border:2px solid #0a0a0b;"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

interface EventLocationPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}

function hasPosition(lat: number | null, lng: number | null): boolean {
  return typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng);
}

function MapClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
    },
  });

  return null;
}

function SyncMap({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();

  useEffect(() => {
    if (!hasPosition(lat, lng)) return;
    map.setView([lat as number, lng as number], Math.max(map.getZoom(), 13), { animate: true });
  }, [lat, lng, map]);

  return null;
}

export function EventLocationPicker({ lat, lng, onChange }: EventLocationPickerProps) {
  const selected = hasPosition(lat, lng);
  const selectedLat = selected ? (lat as number) : null;
  const selectedLng = selected ? (lng as number) : null;
  const center: [number, number] = selectedLat !== null && selectedLng !== null ? [selectedLat, selectedLng] : DEFAULT_CENTER;

  return (
    <div className="overflow-hidden rounded-lg border border-surface-border" style={{ height: 320 }}>
      <MapContainer
        center={center}
        zoom={selected ? 13 : 5}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap, &copy; CARTO"
        />
        <SyncMap lat={selectedLat} lng={selectedLng} />
        <MapClickHandler onChange={onChange} />
        {selectedLat !== null && selectedLng !== null && <Marker position={[selectedLat, selectedLng]} icon={markerIcon} />}
      </MapContainer>
    </div>
  );
}
