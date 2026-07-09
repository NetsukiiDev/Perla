# Toll & Highway Estimate

PERLA can show the participant whether the route **uses a highway** and an **estimated toll**, enabled **per event**.

## Enable it

In the event form, turn on **"Show highway and estimated toll"**. The value is computed when the session starts (from the participant's starting point to the destination) and shown in the stop view.

## How it's computed

A **free, no-API-key** approach (`lib/toll-estimate.ts`):

1. The **OSRM** provider returns the route steps with road references (`ref`, e.g. `A1`, `A14`, `A1var`).
2. Kilometers on tolled motorway segments are summed (excluding a few known toll-free "A" roads: Rome GRA, Milan ring roads, etc.).
3. The toll is estimated as `highway km × tariff`.

> ⚠️ It's an **approximation**: no free source gives the exact toll. The average tariff is configurable via `TOLL_ESTIMATE_EUR_PER_KM` (default `0.08` €/km).

## Example

Florence → Bologna (via A1): ~84 km of motorway → **~€6.7** estimated (real ~€7–8).

## Limitations

- Works with the **OSRM** provider (default). Other providers don't populate the toll.
- The heuristic can misclassify free ring roads/link roads with an "A" ref, or underestimate mountain sections.
- Computed once at session start (like distance/time), not recomputed during the route.
