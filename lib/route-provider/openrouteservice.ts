import type { LatLng, RouteProvider, RouteResult } from "./types";
import { RouteProviderError } from "./types";

interface OpenRouteServiceResponse {
  features?: Array<{
    geometry?: {
      coordinates?: Array<[number, number]>;
    };
    properties?: {
      summary?: {
        distance?: number;
        duration?: number;
      };
    };
  }>;
}

export class OpenRouteServiceProvider implements RouteProvider {
  async getRoute(origin: LatLng, destination: LatLng): Promise<RouteResult> {
    const apiKey = process.env.OPENROUTESERVICE_API_KEY;
    if (!apiKey) {
      throw new RouteProviderError("OPENROUTESERVICE_API_KEY non configurata.");
    }

    const baseUrl = process.env.OPENROUTESERVICE_BASE_URL ?? "https://api.openrouteservice.org";
    const profile = process.env.OPENROUTESERVICE_PROFILE ?? "driving-car";
    const url = `${baseUrl}/v2/directions/${profile}/geojson`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coordinates: [
            [origin.lng, origin.lat],
            [destination.lng, destination.lat],
          ],
          elevation: false,
          instructions: false,
        }),
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new RouteProviderError("Errore di rete nel calcolo del percorso.");
    }

    if (!response.ok) {
      throw new RouteProviderError(`openrouteservice request failed with status ${response.status}`);
    }

    const data = (await response.json()) as OpenRouteServiceResponse;
    const feature = data.features?.[0];
    const coordinates = feature?.geometry?.coordinates;
    const summary = feature?.properties?.summary;
    if (!coordinates?.length || summary?.distance === undefined || summary.duration === undefined) {
      throw new RouteProviderError("Nessun percorso trovato.");
    }

    return {
      polyline: coordinates.map(([lng, lat]) => ({ lat, lng })),
      distanceM: summary.distance,
      durationS: summary.duration,
    };
  }
}
