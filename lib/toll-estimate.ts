// Key-free, heuristic estimate of motorway usage and toll cost from route
// steps. No free API returns exact tolls, so this approximates: steps whose
// road ref is a tolled motorway are summed by distance and multiplied by an
// average per-km tariff. Deliberately approximate — the ref match and flat
// tariff can misclassify some roads (free ring roads, mountain surcharges,
// etc.).
//
// Ref conventions collide across countries -- Italy, Portugal, Germany,
// Austria, Switzerland, the Netherlands and Belgium all use bare "A#" for
// their motorways, but only Italy/Portugal charge a real per-km toll on
// them (the rest are free, or use a flat vignette that doesn't fit a
// per-km estimate at all). Spain's hyphenated "AP-#"/"A-#"/"R-#" convention
// is unambiguous on its own. Since ref shape alone can't disambiguate the
// bare-A countries, `isTolledMotorway` takes the event's destination
// country and only applies the tolled-by-default rule where it's actually
// true. `isMotorwayRef` (used to keep stops off any motorway, tolled or
// not) doesn't need this — it stays country-agnostic.
//
// Tune the tariff with TOLL_ESTIMATE_EUR_PER_KM (default 0.08 €/km).

// Countries whose bare "A#" motorway refs are genuinely per-km tolled.
// Everyone else's bare-A roads are free or flat-fee (vignette) and are
// deliberately NOT charged an estimate, even though they still count as
// "on a motorway" for isMotorwayRef.
const PER_KM_TOLLED_BARE_A_COUNTRIES = new Set(["IT", "PT", "FR"]);

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

// True when a step's road ref denotes a tolled bare-"A#" autostrada/autoestrada
// (no hyphen, e.g. "A1", "A14VAR") in a country that actually charges per-km
// on them — free ring roads/raccordi excluded via FREE_A_ROADS.
function isTolledBareARoad(ref: string, country: string | null | undefined): boolean {
  if (!country || !PER_KM_TOLLED_BARE_A_COUNTRIES.has(country)) return false;
  const m = /^A(\d{1,3})[A-Z]*$/.exec(ref); // A1, A14, A1VAR, A1DIR
  if (!m) return false;
  const base = `A${m[1]}`;
  return !FREE_A_ROADS.has(base) && !FREE_A_ROADS.has(ref);
}

// True when a step's road ref denotes a tolled Spanish motorway: "AP-*"
// (autopista de peaje) or "R-*" (Madrid radial toll roads). Plain "A-*"
// autovías are free by convention. Unambiguous by shape alone (hyphenated),
// so no country check needed.
function isTolledSpanishMotorway(ref: string): boolean {
  return /^(AP|R)-\d{1,3}[A-Z]*$/.test(ref);
}

// True when a step's road ref denotes a tolled motorway. `country` is the
// event destination's ISO country code (see lib/regions/index.ts's
// countryForRegion) — without it, only the unambiguous Spanish convention is
// checked, since bare "A#" is worthless without knowing which country's
// rules apply.
export function isTolledMotorway(ref: string | null | undefined, country?: string | null): boolean {
  if (!ref) return false;
  return ref.split(/[;,]/).some((part) => {
    const r = part.trim().toUpperCase();
    return isTolledBareARoad(r, country) || isTolledSpanishMotorway(r);
  });
}

// True when a step's road ref denotes ANY motorway / trunk link the participant
// shouldn't be routed to stop on — bare "A#"/"RA#" (Italy, Portugal, France,
// Germany, Austria, …), hyphenated "A-#"/"AP-#"/"R-#" (Spain), and bare "M#"
// (UK/Ireland motorways — unlike the others, UK's bare "A#" is an ordinary
// road, not a motorway, so it's deliberately NOT matched here; only "M#" is).
// Broader than isTolledMotorway, used to keep route stops off high-speed
// roads regardless of whether they're tolled.
export function isMotorwayRef(ref: string | null | undefined): boolean {
  if (!ref) return false;
  return ref.split(/[;,]/).some((part) => {
    const r = part.trim();
    return (
      /^(A|RA|M)\d{1,3}[a-z]*$/i.test(r) ||
      /^(A|AP|R)-\d{1,3}[a-z]*$/i.test(r)
    );
  });
}

export function estimateHighwayToll(steps: RouteStepLike[], country?: string | null): TollEstimate {
  // Tracked separately: `hasHighway` means "the route uses a motorway at
  // all" (e.g. a free German Autobahn still counts), while the toll is only
  // charged for the subset that's actually tolled in `country`.
  let highwayDistanceM = 0;
  let tolledDistanceM = 0;
  for (const s of steps) {
    if (isMotorwayRef(s.ref)) highwayDistanceM += s.distance;
    if (isTolledMotorway(s.ref, country)) tolledDistanceM += s.distance;
  }
  // Ignore sub-kilometer slivers (brief on/off ramps) as noise.
  const hasHighway = highwayDistanceM >= 1000;
  const tollCents = tolledDistanceM >= 1000 ? Math.round((tolledDistanceM / 1000) * tariffEurPerKm() * 100) : 0;
  return { hasHighway, highwayDistanceM, tollCents, estimated: true };
}
