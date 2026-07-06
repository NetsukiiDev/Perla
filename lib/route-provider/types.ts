import type { LatLng } from "@/lib/geo";

export interface RouteResult {
  polyline: LatLng[];
  distanceM: number;
  durationS: number;
}

export interface RouteProvider {
  getRoute(origin: LatLng, destination: LatLng): Promise<RouteResult>;
}

export class RouteProviderError extends Error {}

export type { LatLng };
