// Factory selecting the configured routing provider.
import { OsrmRouteProvider } from "./osrm";
import { OpenRouteServiceProvider } from "./openrouteservice";
import { GoogleRoutesProvider } from "./google-routes";
import type { RouteProvider } from "./types";

export function getRouteProvider(): RouteProvider {
  switch (process.env.ROUTE_PROVIDER) {
    case "openrouteservice":
      return new OpenRouteServiceProvider();
    case "google-routes":
      return new GoogleRoutesProvider();
    case "osrm":
    default:
      return new OsrmRouteProvider();
  }
}

export type { RouteProvider, RouteResult, LatLng } from "./types";
export { RouteProviderError } from "./types";
