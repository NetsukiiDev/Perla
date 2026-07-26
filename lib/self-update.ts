// Two "Update now" mechanisms:
//
//  - DEPLOY_HOOK_URL: POST to any external deploy webhook (a Vercel Deploy
//    Hook, a custom CI/CD trigger, the same kind of webhook used to deploy
//    other apps on this box). PERLA itself never touches the filesystem or
//    the running process — whatever's on the other end owns the rebuild.
//    Takes priority when set.
//  - Self-update (default when DEPLOY_HOOK_URL isn't set, unless explicitly
//    disabled with SELF_UPDATE_ENABLED=false): runs `git pull` in this
//    process and, only when dependencies actually changed, `npm ci`.
//      - In production it also rebuilds and exits, relying on a process
//        manager (systemd, PM2, …) to restart it with the new build — in a
//        setup without one this just kills the server, which is the
//        deliberate tradeoff for "click Update, it's live" with no extra
//        config.
//      - Outside production (e.g. `next dev`) it deliberately skips the
//        build/exit: the dev server's own file watcher picks up the pulled
//        changes on its own, and running `next build` concurrently would
//        fight over the same .next directory and corrupt the dev server.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { COMMIT_SHA } from "@/lib/version";

const execFileAsync = promisify(execFile);

export type UpdateMode = "deploy-hook" | "self-update" | null;

export function updateModeConfigured(): UpdateMode {
  if (process.env.DEPLOY_HOOK_URL) return "deploy-hook";
  if (process.env.SELF_UPDATE_ENABLED === "false") return null;
  return "self-update";
}

export type UpdateResult = { ok: true } | { ok: false; error: string };

let updateInProgress = false;

export async function performUpdate(): Promise<UpdateResult> {
  if (updateInProgress) return { ok: false, error: "already_running" };
  const mode = updateModeConfigured();
  if (!mode) return { ok: false, error: "not_configured" };

  updateInProgress = true;
  try {
    return mode === "deploy-hook" ? await triggerDeployHook() : await runSelfUpdate();
  } finally {
    updateInProgress = false;
  }
}

async function triggerDeployHook(): Promise<UpdateResult> {
  const url = process.env.DEPLOY_HOOK_URL;
  if (!url) return { ok: false, error: "not_configured" };
  try {
    const res = await fetch(url, { method: "POST", signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return { ok: false, error: `deploy hook responded with status ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "network error" };
  }
}

interface ExecError {
  message: string;
  stderr?: string;
}

function describeExecError(err: unknown): string {
  const e = err as ExecError;
  const stderr = e.stderr?.trim();
  return stderr ? `${e.message}\n${stderr.slice(0, 500)}` : e.message ?? String(err);
}

async function currentSha(cwd: string): Promise<string> {
  const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd, timeout: 10_000 });
  return stdout.trim();
}

// The commit actually running, for Settings → Version. Vercel injects it as
// an env var; a self-hosted checkout has to ask git, and used to just show
// "N/A" — which is the one place it matters most now that the same panel can
// switch branches. Lives here rather than in lib/version.ts because that
// module is also imported by app/admin/layout.tsx, and shelling out to git
// has no business being reachable from a layout.
export async function getCommitSha(): Promise<string | null> {
  if (COMMIT_SHA) return COMMIT_SHA;
  try {
    return await currentSha(process.cwd());
  } catch {
    // Not a git checkout (a tarball deploy, a container without .git).
    return null;
  }
}

// Whether moving from `fromSha` to the current HEAD touched the dependency
// manifests. Asked of git rather than read out of `git pull`'s printed
// diffstat, which only describes what the *pull* brought in: after a branch
// checkout the pull can report "Already up to date." while the checkout
// itself swapped package.json underneath us, and npm ci would be skipped.
async function dependenciesChangedSince(cwd: string, fromSha: string): Promise<boolean> {
  const { stdout } = await execFileAsync(
    "git",
    ["diff", "--name-only", `${fromSha}..HEAD`, "--", "package.json", "package-lock.json"],
    { cwd, timeout: 10_000 },
  );
  return stdout.trim().length > 0;
}

async function runSelfUpdate(): Promise<UpdateResult> {
  const cwd = process.cwd();
  const isProduction = process.env.NODE_ENV === "production";
  try {
    const before = await currentSha(cwd);
    await execFileAsync("git", ["pull", "--ff-only"], { cwd, timeout: 60_000 });
    if (await dependenciesChangedSince(cwd, before)) {
      await execFileAsync("npm", ["ci"], { cwd, timeout: 300_000 });
    }
    // The generated Prisma client (gitignored — see lib/db.ts) must be
    // regenerated after every pull, not just when package.json changed: a
    // schema.prisma-only change wouldn't otherwise trigger it, leaving
    // stale types that don't match fields the pulled schema just added.
    await execFileAsync("npm", ["run", "db:generate"], { cwd, timeout: 60_000 });
    if (isProduction) {
      await execFileAsync("npm", ["run", "build"], { cwd, timeout: 300_000 });
    }
  } catch (err) {
    return { ok: false, error: describeExecError(err) };
  }

  if (isProduction) {
    // Only a process manager restarting us on exit makes this useful. Give
    // the HTTP response time to flush to the client before exiting.
    setTimeout(() => process.exit(0), 500);
  }
  return { ok: true };
}

// ── Branch management ───────────────────────────────────────────────────

export interface BranchInfo {
  current: string;
  branches: string[];
}

let branchInProgress = false;

export async function getBranches(): Promise<{ ok: true; data: BranchInfo } | { ok: false; error: string }> {
  const cwd = process.cwd();
  try {
    const [{ stdout: current }, { stdout: list }] = await Promise.all([
      execFileAsync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd, timeout: 10_000 }),
      execFileAsync("git", ["branch", "-a", "--no-color"], { cwd, timeout: 10_000 }),
    ]);
    const seen = new Set<string>();
    const branches: string[] = [];
    for (const line of list.split("\n")) {
      const raw = line.replace(/^\*?\s+/, "").trim();
      if (!raw || raw.includes("HEAD")) continue;
      const name = raw.replace(/^remotes\/origin\//, "");
      if (name && !seen.has(name)) {
        seen.add(name);
        branches.push(name);
      }
    }
    return { ok: true, data: { current: current.trim(), branches: branches.sort() } };
  } catch (err) {
    return { ok: false, error: describeExecError(err) };
  }
}

export async function switchBranch(branch: string): Promise<UpdateResult> {
  // `branch` reaches git as an argv element (no shell), so there's nothing to
  // inject — but an unchecked value is still handed to `git checkout`, where
  // "-f" would discard the working tree and any commit-ish would leave the
  // repo detached with the ff-only pull below failing right after. Only names
  // git itself just listed are accepted.
  const known = await getBranches();
  if (!known.ok) return { ok: false, error: known.error };
  if (!known.data.branches.includes(branch)) return { ok: false, error: "unknown_branch" };

  if (branchInProgress) return { ok: false, error: "already_running" };
  branchInProgress = true;
  try {
    const cwd = process.cwd();
    const isProduction = process.env.NODE_ENV === "production";

    const before = await currentSha(cwd);
    await execFileAsync("git", ["checkout", branch], { cwd, timeout: 30_000 });
    await execFileAsync("git", ["pull", "--ff-only"], { cwd, timeout: 60_000 });

    if (await dependenciesChangedSince(cwd, before)) {
      await execFileAsync("npm", ["ci"], { cwd, timeout: 300_000 });
    }
    await execFileAsync("npm", ["run", "db:generate"], { cwd, timeout: 60_000 });
    if (isProduction) {
      await execFileAsync("npm", ["run", "build"], { cwd, timeout: 300_000 });
    }

    if (isProduction) {
      setTimeout(() => process.exit(0), 500);
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: describeExecError(err) };
  } finally {
    branchInProgress = false;
  }
}
