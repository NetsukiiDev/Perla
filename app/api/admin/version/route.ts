// GET /api/admin/version — current version + build info, and whether a newer
// version exists on GitHub (latest release, falling back to the newest tag).
// Fails gracefully: if GitHub is unreachable, `checkFailed` is true.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { APP_NAME, APP_VERSION, BUILD_ENV, COMMIT_SHA, GITHUB_REPO, isNewerVersion } from "@/lib/version";
import { updateModeConfigured } from "@/lib/self-update";

export const runtime = "nodejs";

async function githubJson(path: string): Promise<unknown | null> {
  // Plain fetch options only: Next's fetch instrumentation can throw
  // "fetch failed" when combined with AbortSignal.timeout(); cache: "no-store"
  // keeps the result fresh without opting into the caching path.
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/${path}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "PERLA" },
    cache: "no-store",
  });
  return res.ok ? res.json() : null;
}

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const rel = (await githubJson("releases/latest")) as { tag_name?: unknown } | null;
    if (rel && typeof rel.tag_name === "string" && rel.tag_name) {
      return rel.tag_name.replace(/^v/i, "");
    }

    // Repos without published releases: use the newest tag instead.
    const tags = (await githubJson("tags?per_page=1")) as Array<{ name?: unknown }> | null;
    const name = Array.isArray(tags) && typeof tags[0]?.name === "string" ? tags[0].name : "";
    if (name) return name.replace(/^v/i, "");
  } catch (err) {
    // Network / TLS failure (e.g. a local VPN or antivirus intercepting TLS
    // breaks certificate verification). Surfaced to the UI as "check failed".
    const cause = err instanceof Error && "cause" in err ? err.cause : undefined;
    console.error(
      "[version] GitHub update check failed:",
      err instanceof Error ? err.message : err,
      cause ? `(cause: ${cause instanceof Error ? cause.message : JSON.stringify(cause)})` : "",
    );
  }
  return null;
}

export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const latest = await fetchLatestVersion();
  const updateAvailable = latest ? isNewerVersion(latest, APP_VERSION) : false;

  return NextResponse.json({
    name: APP_NAME,
    version: APP_VERSION,
    latest,
    updateAvailable,
    checkFailed: latest === null,
    commit: COMMIT_SHA,
    env: BUILD_ENV,
    repoUrl: `https://github.com/${GITHUB_REPO}`,
    updateMode: updateModeConfigured(),
  });
}
