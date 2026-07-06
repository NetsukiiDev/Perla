import { decodePolyline } from "@/lib/polyline";
import type { LatLng, RouteProvider, RouteResult } from "./types";
import { RouteProviderError } from "./types";

interface GoogleRoutesResponse {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
    polyline?: {
      encodedPolyline?: string;
    };
  }>;
}

function parseGoogleDurationSeconds(value: string | undefined): number | null {
  if (!value) return null;
  const match = /^(\d+(?:\.\d+)?)s$/.exec(value);
  return match ? Number(match[1]) : null;
}

export class GoogleRoutesProvider implements RouteProvider {
  async getRoute(origin: LatLng, destination: LatLng): Promise<RouteResult> {
    const apiKey = process.env.GOOGLE_ROUTES_API_KEY;
    if (!apiKey) {
      throw new RouteProviderError("GOOGLE_ROUTES_API_KEY non configurata.");
    }

    const url = process.env.GOOGLE_ROUTES_BASE_URL ?? "https://routes.googleapis.com/directions/v2:computeRoutes";
    const travelMode = process.env.GOOGLE_ROUTES_TRAVEL_MODE ?? "DRIVE";

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
          destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
          travelMode,
          polylineQuality: "HIGH_QUALITY",
        }),
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new RouteProviderError("Errore di rete nel calcolo del percorso.");
    }

    if (!response.ok) {
      throw new RouteProviderError(`Google Routes request failed with status ${response.status}`);
    }

    const data = (await response.json()) as GoogleRoutesResponse;
    const route = data.routes?.[0];
    const encoded = route?.polyline?.encodedPolyline;
    const durationS = parseGoogleDurationSeconds(route?.duration);
    if (!encoded || route?.distanceMeters === undefined || durationS === null) {
      throw new RouteProviderError("Nessun percorso trovato.");
    }

    return {
      polyline: decodePolyline(encoded).map(([lat, lng]) => ({ lat, lng })),
      distanceM: route.distanceMeters,
      durationS,
    };
  }
}
