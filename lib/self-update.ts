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

async function runSelfUpdate(): Promise<UpdateResult> {
  const cwd = process.cwd();
  const isProduction = process.env.NODE_ENV === "production";
  try {
    const { stdout } = await execFileAsync("git", ["pull", "--ff-only"], { cwd, timeout: 60_000 });
    const depsChanged = /package(-lock)?\.json/.test(stdout);
    if (depsChanged) {
      await execFileAsync("npm", ["ci"], { cwd, timeout: 300_000 });
    }
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
