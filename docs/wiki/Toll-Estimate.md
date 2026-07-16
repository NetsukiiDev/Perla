# Toll & Highway Estimate

PERLA can show the participant whether the route **uses a highway** and an **estimated toll**, enabled **per event**.

## Enable it

In the event form, turn on **"Show highway and estimated toll"**. The value is computed when the session starts (from the participant's starting point to the destination) and shown in the stop view.

## How it's computed

A **free, no-API-key** approach (`lib/toll-estimate.ts`):

1. The **OSRM** provider returns the route steps with road references (`ref`).
2. **"Uses a highway"** and **"tolled"** are tracked separately, since several countries share the exact same bare `A#` ref convention but don't all charge a per-km toll on it (e.g. German/Austrian/Swiss motorways are free or flat-vignette, not metered):
   - Any `A#`/`RA#` (bare) or `A-#`/`AP-#`/`R-#` (hyphenated) ref counts as "on a highway", regardless of country.
   - Only these count toward the **toll estimate**:
     - **Italy & Portugal**: bare refs like `A1`, `A14`, `A1var` (excluding a few known toll-free Italian "A" roads: Rome GRA, Milan ring roads, etc.).
     - **Spain**: hyphenated `AP-*` (autopista de peaje) and `R-*` (Madrid radial); plain `A-*` (autovía) is free.
   - Everywhere else (Germany, Austria, Poland, Netherlands, Belgium, Switzerland, Czechia, Slovakia, Denmark, …), the route can still show "uses a highway" but the toll is always **€0** — no per-km charge is invented for free/vignette roads.
3. The toll is estimated as `tolled km × tariff`, using the event destination's country (`lib/regions` → `countryForRegion`) to pick the right ruleset.

> ⚠️ It's an **approximation**: no free source gives the exact toll. The average tariff is configurable via `TOLL_ESTIMATE_EUR_PER_KM` (default `0.08` €/km) and applies to every tolled country.

## Example

Florence → Bologna (via A1): ~84 km of motorway → **~€6.7** estimated (real ~€7–8).

## Limitations

- Works with the **OSRM** provider (default). Other providers don't populate the toll.
- The heuristic can misclassify free ring roads/link roads with an "A" ref, or underestimate mountain sections.
- Computed once at session start (like distance/time), not recomputed during the route.
