import type { LatLng } from "@/lib/geo";
import type { TollEstimate } from "@/lib/toll-estimate";

export interface RouteResult {
  polyline: LatLng[];
  distanceM: number;
  durationS: number;
  // Motorway/toll estimate when the provider exposes per-step road refs
  // (OSRM). Undefined for providers that don't (ORS/Google here).
  toll?: TollEstimate;
  // Per-segment motorway mask aligned to `polyline` (length polyline.length-1):
  // highwaySegments[i] = is the segment polyline[i]->polyline[i+1] on a
  // motorway. Used to keep route stops off the highway. Undefined when the
  // provider can't classify segments.
  highwaySegments?: boolean[];
}

export interface RouteProvider {
  getRoute(origin: LatLng, destination: LatLng): Promise<RouteResult>;
}

export class RouteProviderError extends Error {}

export type { LatLng };
