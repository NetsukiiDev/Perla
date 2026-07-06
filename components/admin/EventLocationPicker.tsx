"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { MapsTileLayer, type MapStyle } from "@/components/shared/MapsTileLayer";
import { MapStyleToggle } from "@/components/shared/MapStyleToggle";
import { parseGoogleMapsUrl, isGoogleShortUrl } from "@/lib/parse-maps-url";
import { Search, MapPin } from "lucide-react";

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

function extractCoords(input: string): { lat: number; lng: number } | null {
  // Direct lat,lng input
  const direct = input.match(/^(-?\d+\.?\d*)\s*[,;\s]+\s*(-?\d+\.?\d*)$/);
  if (direct) return { lat: parseFloat(direct[1]), lng: parseFloat(direct[2]) };

  return parseGoogleMapsUrl(input);
}

export function EventLocationPicker({ lat, lng, onChange }: EventLocationPickerProps) {
  const selected = hasPosition(lat, lng);
  const selectedLat = selected ? (lat as number) : null;
  const selectedLng = selected ? (lng as number) : null;
  const center: [number, number] = selectedLat !== null && selectedLng !== null ? [selectedLat, selectedLng] : DEFAULT_CENTER;

  const [mapStyle, setMapStyle] = useState<MapStyle>("dark");
  const [searchInput, setSearchInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = useCallback(async () => {
    const input = searchInput.trim();
    if (!input) return;

    setSearchError(null);
    setSearching(true);

    // Try to extract coords directly from the input
    const coords = extractCoords(input);
    if (coords) {
      onChange(coords.lat, coords.lng);
      setSearching(false);
      setSearchInput("");
      return;
    }

    // If it's a Google short URL, resolve it first
    let lookupUrl = input;
    if (isGoogleShortUrl(input)) {
      try {
        const res = await fetch("/api/resolve-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: input }),
        });
        const data = await res.json();
        if (data.resolvedUrl) {
          const resolved = parseGoogleMapsUrl(data.resolvedUrl);
          if (resolved) {
            onChange(resolved.lat, resolved.lng);
            setSearching(false);
            setSearchInput("");
            return;
          }
          lookupUrl = data.resolvedUrl;
        }
      } catch {
        setSearchError("Impossibile risolvere il link.");
        setSearching(false);
        return;
      }
    }

    // Fallback: geocode via Nominatim
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(lookupUrl)}`,
        { headers: { "User-Agent": "PERLA/1.0" } },
      );
      const data = await res.json();
      if (data?.length > 0) {
        onChange(Number(data[0].lat), Number(data[0].lon));
        setSearchInput("");
      } else {
        setSearchError("Nessuna posizione trovata. Prova con latitudine, longitudine.");
      }
    } catch {
      setSearchError("Ricerca fallita. Riprova.");
    }

    setSearching(false);
  }, [searchInput, onChange]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            ref={searchInputRef}
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Link Google Maps, coordinate (lat, lng) o nome luogo..."
            className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 pr-9 text-sm text-foreground focus:border-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching || !searchInput.trim()}
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted hover:text-foreground disabled:opacity-40"
            title="Cerca"
          >
            {searching ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Search size={16} />
            )}
          </button>
        </div>
        <MapStyleToggle style={mapStyle} onChange={setMapStyle} />
      </div>

      {searchError && (
        <p className="flex items-center gap-1 text-xs text-danger">
          <MapPin size={12} />
          {searchError}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-surface-border" style={{ height: 320 }}>
        <MapContainer
          center={center}
          zoom={selected ? 13 : 5}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <MapsTileLayer style={mapStyle} />
          <SyncMap lat={selectedLat} lng={selectedLng} />
          <MapClickHandler onChange={onChange} />
          {selectedLat !== null && selectedLng !== null && <Marker position={[selectedLat, selectedLng]} icon={markerIcon} />}
        </MapContainer>
      </div>
    </div>
  );
}
