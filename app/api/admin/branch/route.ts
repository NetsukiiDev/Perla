// GET /api/admin/branch — branches on GitHub, plus which one this checkout is
//   on and whether it's at the same commit. Polled by the Version tab, so the
//   GitHub call is cached briefly in lib/github.ts; ?refresh=1 bypasses it.
// PUT /api/admin/branch — switch to one of those branches.
//
// The list is deliberately GitHub's rather than `git branch -a`: the local
// answer is only ever as fresh as the last fetch, which on a deploy box can
// be days old, so a branch pushed minutes ago wouldn't appear at all.
import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-guard";
import { getLocalBranchState, listLocalBranches, switchBranch } from "@/lib/self-update";
import { fetchGithubBranches } from "@/lib/github";
import { writeAccessLog } from "@/lib/access-log";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireAdminUser(["admin"]);
  if ("response" in auth) return auth.response;

  const local = await getLocalBranchState();
  if (!local.ok) {
    // No git checkout to switch (Vercel, tarball deploy) — not an error, the
    // feature just doesn't apply. The UI says so instead of showing a broken
    // panel.
    return NextResponse.json({ available: false, branches: [] });
  }

  const force = new URL(req.url).searchParams.get("refresh") === "1";
  const remote = await fetchGithubBranches(force);

  const branches = remote.ok
    ? remote.branches.map((b) => ({
        name: b.name,
        sha: b.sha,
        current: b.name === local.data.current,
        // Only meaningful for the branch actually checked out: for the others
        // there is no local commit to compare GitHub's against.
        upToDate: b.name === local.data.current ? b.sha === local.data.sha : null,
      }))
    : (await listLocalBranches()).map((name) => ({
        name,
        sha: "",
        current: name === local.data.current,
        upToDate: null,
      }));

  return NextResponse.json({
    available: true,
    current: local.data.current,
    currentSha: local.data.sha,
    branches,
    source: remote.ok ? "github" : "local",
    fetchedAt: remote.ok ? remote.fetchedAt : Date.now(),
    error: remote.ok ? null : remote.error,
  });
}

export async function PUT(req: Request) {
  const auth = await requireAdminUser(["admin"]);
  if ("response" in auth) return auth.response;

  const body = (await req.json().catch(() => null)) as { branch?: string } | null;
  const branch = body?.branch?.trim();
  if (!branch) {
    return NextResponse.json({ error: "missing_branch" }, { status: 400 });
  }

  // Accepted names come from GitHub when reachable, falling back to what git
  // knows locally — so a GitHub outage can't strand an admin on the wrong
  // branch, and neither source lets an arbitrary string reach git checkout.
  const remote = await fetchGithubBranches();
  const allowed = remote.ok ? remote.branches.map((b) => b.name) : await listLocalBranches();

  const res = await switchBranch(branch, allowed);
  if (!res.ok) {
    console.error("[branch] switch failed:", res.error);
    return NextResponse.json({ error: res.error }, { status: 500 });
  }

  await writeAccessLog({ type: "admin_action", metadata: { action: `Branch cambiata su ${branch}` } });
  return NextResponse.json({ ok: true, branch });
}
