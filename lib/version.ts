// Single source of truth for the app version + build metadata. The version
// itself comes from package.json so there is only one place to bump. Build /
// commit info is filled by the platform at build time when available (Vercel
// injects VERCEL_GIT_COMMIT_SHA). Server-only: the Settings UI reads this
// through /api/admin/version rather than importing it into the client.
import pkg from "../package.json";

export const APP_NAME = "PERLA";
export const APP_VERSION: string = pkg.version;
export const GITHUB_REPO = "NetsukiiDev/Perla";

export const COMMIT_SHA: string | null =
  process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.COMMIT_SHA ?? null;

export const BUILD_ENV: string =
  process.env.VERCEL === "1" ? "vercel" : (process.env.NODE_ENV ?? "development");

// Compares two semver-ish strings; true when `latest` is strictly newer.
export function isNewerVersion(latest: string, current: string): boolean {
  const parse = (v: string): number[] => {
    const m = /(\d+)\.(\d+)\.(\d+)/.exec(v);
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [];
  };
  const a = parse(latest);
  const b = parse(current);
  if (a.length !== 3 || b.length !== 3) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
}
