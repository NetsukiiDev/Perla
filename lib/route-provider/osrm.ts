// Default, fully-implemented routing provider. Calls a configurable OSRM
// instance (OSRM_BASE_URL, defaults to the public demo server).
import { decodePolyline } from "@/lib/polyline";
import { estimateItalianToll, type RouteStepLike } from "@/lib/toll-estimate";
import type { LatLng, RouteProvider, RouteResult } from "./types";
import { RouteProviderError } from "./types";

interface OsrmStep {
  ref?: string;
  name?: string;
  distance: number;
}

interface OsrmRouteResponse {
  code: string;
  routes?: Array<{
    geometry: string;
    distance: number;
    duration: number;
    legs?: Array<{ steps?: OsrmStep[] }>;
  }>;
}

export class OsrmRouteProvider implements RouteProvider {
  async getRoute(origin: LatLng, destination: LatLng): Promise<RouteResult> {
    const baseUrl = process.env.OSRM_BASE_URL ?? "https://router.project-osrm.org";
    const profile = process.env.OSRM_PROFILE ?? "driving";
    const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    // steps=true exposes per-segment road refs, used to estimate motorway/toll.
    const path = `/route/v1/${profile}/${coords}?overview=full&geometries=polyline&steps=true`;

    let response: Response;
    try {
      response = await fetchOsrm(`${baseUrl}${path}`);
    } catch (err) {
      if (baseUrl === "https://router.project-osrm.org") {
        response = await fetchOsrm(`http://router.project-osrm.org${path}`).catch(() => {
          throw new RouteProviderError(networkErrorMessage(err));
        });
      } else {
        throw new RouteProviderError(networkErrorMessage(err));
      }
    }

    if (!response.ok) {
      throw new RouteProviderError(`OSRM request failed with status ${response.status}`);
    }

    const data = (await response.json()) as OsrmRouteResponse;
    if (data.code !== "Ok" || !data.routes?.length) {
      throw new RouteProviderError("Nessun percorso trovato.");
    }

    const route = data.routes[0];
    const polyline: LatLng[] = decodePolyline(route.geometry).map(([lat, lng]) => ({ lat, lng }));

    const steps: RouteStepLike[] = (route.legs ?? []).flatMap((leg) => leg.steps ?? []);

    return {
      polyline,
      distanceM: route.distance,
      durationS: route.duration,
      toll: estimateItalianToll(steps),
    };
  }
}

async function fetchOsrm(url: string): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(8000) });
}

function networkErrorMessage(err: unknown): string {
  const cause = err instanceof Error && "cause" in err ? (err.cause as { code?: string } | undefined) : undefined;
  if (cause?.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE") {
    return "Errore certificato TLS nel calcolo del percorso.";
  }
  return "Errore di rete nel calcolo del percorso.";
}
