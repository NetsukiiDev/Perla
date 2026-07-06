export interface LatLngResult {
  lat: number;
  lng: number;
}

export function parseGoogleMapsUrl(input: string): LatLngResult | null {
  const url = input.trim();

  // @lat,lng,zoom — most common Google Maps format
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

  // ?q=lat,lng
  const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };

  // ?ll=lat,lng
  const llMatch = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (llMatch) return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };

  // /search/...@lat,lng,...
  const searchMatch = url.match(/\/search\/.*?@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (searchMatch) return { lat: parseFloat(searchMatch[1]), lng: parseFloat(searchMatch[2]) };

  return null;
}

export function isGoogleShortUrl(input: string): boolean {
  return /^https?:\/\/maps\.app\.goo\.gl\//i.test(input.trim());
}
