// GET /api/admin/version — current version + build info, and whether a newer
// version exists on GitHub (latest release, falling back to the newest tag).
// Fails gracefully: if GitHub is unreachable, `checkFailed` is true.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { APP_NAME, APP_VERSION, BUILD_ENV, COMMIT_SHA, GITHUB_REPO, isNewerVersion } from "@/lib/version";

export const runtime = "nodejs";

async function fetchLatestVersion(): Promise<string | null> {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "PERLA" };
  try {
    const rel = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers,
      signal: AbortSignal.timeout(6000),
    });
    if (rel.ok) {
      const data = await rel.json();
      const tag = typeof data?.tag_name === "string" ? data.tag_name : "";
      if (tag) return tag.replace(/^v/i, "");
    }

    // Repos without published releases: use the newest tag instead.
    const tags = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/tags?per_page=1`, {
      headers,
      signal: AbortSignal.timeout(6000),
    });
    if (tags.ok) {
      const arr = await tags.json();
      const name = Array.isArray(arr) && typeof arr[0]?.name === "string" ? arr[0].name : "";
      if (name) return name.replace(/^v/i, "");
    }
  } catch {
    // network / timeout — treated as "check failed" below
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
  });
}
