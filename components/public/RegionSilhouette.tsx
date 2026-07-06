import { REGION_SILHOUETTE_PATHS, REGION_SILHOUETTE_VIEWBOX } from "@/lib/region-silhouette-paths";

function regionKey(region: string): string {
  return region
    .toLocaleLowerCase("it-IT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function RegionSilhouette({ region }: { region: string }) {
  const path = REGION_SILHOUETTE_PATHS[regionKey(region)];
  if (!path) return null;

  return (
    <div className="flex h-24 w-24 shrink-0 items-center justify-center text-accent" aria-hidden="true">
      <svg viewBox={REGION_SILHOUETTE_VIEWBOX} className="h-full w-full drop-shadow-[0_0_18px_rgba(232,232,236,0.12)]">
        <path d={path} fill="currentColor" />
      </svg>
    </div>
  );
}
