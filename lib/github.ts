// GitHub REST client, shared by the update check (latest release) and the
// branch switcher. The repo is public, so everything here works
// unauthenticated; GITHUB_TOKEN is optional and only raises the rate limit
// (60 requests/hour per IP → 5000/hour).
import { GITHUB_REPO } from "@/lib/version";

export async function githubJson(path: string): Promise<unknown | null> {
  // Plain fetch options only: Next's fetch instrumentation can throw
  // "fetch failed" when combined with AbortSignal.timeout(); cache: "no-store"
  // keeps the result fresh without opting into the caching path.
  const token = process.env.GITHUB_TOKEN;
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "PERLA",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });
  return res.ok ? res.json() : null;
}

export interface GithubBranch {
  name: string;
  sha: string;
}

interface BranchesCache {
  fetchedAt: number;
  branches: GithubBranch[];
}

// The panel polls to stay current, so the network call is cached briefly and
// shared across every admin with the tab open: without it a couple of open
// panels would exhaust the unauthenticated hourly budget on their own. A
// human pressing Refresh bypasses it (force), which is naturally bounded.
const CACHE_TTL_MS = 60_000;
let cache: BranchesCache | null = null;

export type GithubBranchesResult =
  | { ok: true; branches: GithubBranch[]; fetchedAt: number; cached: boolean }
  | { ok: false; error: string };

export async function fetchGithubBranches(force = false): Promise<GithubBranchesResult> {
  if (!force && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return { ok: true, branches: cache.branches, fetchedAt: cache.fetchedAt, cached: true };
  }

  try {
    // 100 is the API's page maximum. A repo with more branches than that would
    // need pagination; this one is nowhere near, and a truncated list is still
    // more useful than none.
    const raw = (await githubJson("branches?per_page=100")) as Array<{ name?: unknown; commit?: { sha?: unknown } }> | null;
    if (!Array.isArray(raw)) {
      return { ok: false, error: "GitHub did not return a branch list (rate limit or repo unreachable)" };
    }

    const branches = raw
      .filter((b): b is { name: string; commit?: { sha?: unknown } } => typeof b.name === "string" && b.name.length > 0)
      .map((b) => ({ name: b.name, sha: typeof b.commit?.sha === "string" ? b.commit.sha : "" }))
      .sort((a, b) => a.name.localeCompare(b.name));

    cache = { fetchedAt: Date.now(), branches };
    return { ok: true, branches, fetchedAt: cache.fetchedAt, cached: false };
  } catch (err) {
    // Network / TLS failure (e.g. a local VPN or antivirus intercepting TLS).
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
