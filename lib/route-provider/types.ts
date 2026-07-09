import type { LatLng } from "@/lib/geo";
import type { TollEstimate } from "@/lib/toll-estimate";

export interface RouteResult {
  polyline: LatLng[];
  distanceM: number;
  durationS: number;
  // Motorway/toll estimate when the provider exposes per-step road refs
  // (OSRM). Undefined for providers that don't (ORS/Google here).
  toll?: TollEstimate;
}

export interface RouteProvider {
  getRoute(origin: LatLng, destination: LatLng): Promise<RouteResult>;
}

export class RouteProviderError extends Error {}

export type { LatLng };
