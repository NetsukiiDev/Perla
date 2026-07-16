// Country-agnostic entry point for event-destination region detection. Tries
// each supported country's boundaries in turn; the stored `region` name alone
// is enough to disambiguate downstream (Italian and Spanish names don't
// collide), so callers don't need to track which country matched.
import { detectItalianRegion } from "@/lib/detect-italian-region";
import { detectSpanishRegion } from "@/lib/detect-spanish-region";

export function detectRegion(lat: number, lng: number): string | null {
  return detectItalianRegion(lat, lng) ?? detectSpanishRegion(lat, lng);
}
