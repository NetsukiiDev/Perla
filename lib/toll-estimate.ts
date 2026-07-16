// Key-free, heuristic estimate of motorway usage and toll cost from route
// steps. No free API returns exact tolls, so this approximates: steps whose
// road ref is a tolled motorway are summed by distance and multiplied by an
// average per-km tariff. Deliberately approximate — the ref match and flat
// tariff can misclassify some roads (free ring roads, mountain surcharges,
// etc.).
//
// Covers two ref conventions (disambiguated by hyphen, since they never
// overlap):
//  - Italian autostrade: no hyphen, e.g. "A1", "A14", "A1var" (tolled unless
//    in FREE_A_ROADS).
//  - Spanish autopistas/autovías: hyphenated, e.g. "AP-7" (tolled autopista
//    de peaje), "A-6" (free autovía), "R-3" (tolled Madrid radial).
//
// Tune the tariff with TOLL_ESTIMATE_EUR_PER_KM (default 0.08 €/km).

export interface RouteStepLike {
  ref?: string | null;
  name?: string | null;
  distance: number; // meters
}

export interface TollEstimate {
  hasHighway: boolean;
  highwayDistanceM: number;
  tollCents: number; // estimated EUR cents; 0 when no tolled highway
  estimated: true;
}

// Italian motorways that carry an "A" ref in OSM but are toll-free (ring
// roads / raccordi / a few free autostrade). Kept intentionally small and
// confident; everything else with an A-number ref is treated as tolled.
const FREE_A_ROADS = new Set([
  "A90", // Grande Raccordo Anulare (Roma)
  "A91", // Roma–Fiumicino
  "A50", // Tangenziale Ovest Milano
  "A51", // Tangenziale Est Milano
  "A52", // Tangenziale Nord Milano
  "A2", // Autostrada del Mediterraneo (Salerno–Reggio Calabria)
  "A19", // Palermo–Catania
  "A29", // Palermo–Mazara del Vallo
]);

function tariffEurPerKm(): number {
  const raw = Number(process.env.TOLL_ESTIMATE_EUR_PER_KM);
  return Number.isFinite(raw) && raw > 0 ? raw : 0.08;
}

// True when a step's road ref denotes a tolled Italian autostrada (no hyphen,
// e.g. "A1", "A14VAR") — free ring roads/raccordi excluded via FREE_A_ROADS.
function isTolledItalianAutostrada(ref: string): boolean {
  const m = /^A(\d{1,3})[A-Z]*$/.exec(ref); // A1, A14, A1VAR, A1DIR
  if (!m) return false;
  const base = `A${m[1]}`;
  return !FREE_A_ROADS.has(base) && !FREE_A_ROADS.has(ref);
}

// True when a step's road ref denotes a tolled Spanish motorway: "AP-*"
// (autopista de peaje) or "R-*" (Madrid radial toll roads). Plain "A-*"
// autovías are free by convention.
function isTolledSpanishMotorway(ref: string): boolean {
  return /^(AP|R)-\d{1,3}[A-Z]*$/.test(ref);
}

// True when a step's road ref denotes a tolled motorway, Italian or Spanish.
export function isTolledMotorway(ref: string | null | undefined): boolean {
  if (!ref) return false;
  return ref.split(/[;,]/).some((part) => {
    const r = part.trim().toUpperCase();
    return isTolledItalianAutostrada(r) || isTolledSpanishMotorway(r);
  });
}

// True when a step's road ref denotes ANY motorway / trunk link the participant
// shouldn't be routed to stop on — Italian autostrade (A*, RA*, tolled or
// free) and Spanish autopistas/autovías/radiales (A-*, AP-*, R-*, tolled or
// free). Broader than isTolledMotorway, used to keep route stops off
// high-speed roads.
export function isMotorwayRef(ref: string | null | undefined): boolean {
  if (!ref) return false;
  return ref.split(/[;,]/).some((part) => {
    const r = part.trim();
    return /^(A|RA)\d{1,3}[a-z]*$/i.test(r) || /^(A|AP|R)-\d{1,3}[a-z]*$/i.test(r);
  });
}

export function estimateHighwayToll(steps: RouteStepLike[]): TollEstimate {
  let highwayDistanceM = 0;
  for (const s of steps) {
    if (isTolledMotorway(s.ref)) highwayDistanceM += s.distance;
  }
  // Ignore sub-kilometer slivers (brief on/off ramps) as noise.
  const hasHighway = highwayDistanceM >= 1000;
  const tollCents = hasHighway ? Math.round((highwayDistanceM / 1000) * tariffEurPerKm() * 100) : 0;
  return { hasHighway, highwayDistanceM, tollCents, estimated: true };
}
