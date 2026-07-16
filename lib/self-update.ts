// Two opt-in "Update now" mechanisms — both off unless explicitly configured,
// so adding this feature can't cause anything to happen on its own:
//
//  - DEPLOY_HOOK_URL: POST to any external deploy webhook (a Vercel Deploy
//    Hook, a custom CI/CD trigger, the same kind of webhook used to deploy
//    other apps on this box). PERLA itself never touches the filesystem or
//    the running process — whatever's on the other end owns the rebuild.
//    Takes priority when both are set.
//  - SELF_UPDATE_ENABLED=true: runs `git pull` + `npm ci` + `npm run build`
//    in this process, then exits. Only sensible when PERLA runs under a
//    process manager (systemd, PM2, …) configured to restart on exit — in
//    any other setup this just kills the server. Skips the exit outside
//    production so a stray env var can't kill a local `next dev`.
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type UpdateMode = "deploy-hook" | "self-update" | null;

export function updateModeConfigured(): UpdateMode {
  if (process.env.DEPLOY_HOOK_URL) return "deploy-hook";
  if (process.env.SELF_UPDATE_ENABLED === "true") return "self-update";
  return null;
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
  try {
    await execFileAsync("git", ["pull", "--ff-only"], { cwd, timeout: 60_000 });
    await execFileAsync("npm", ["ci"], { cwd, timeout: 300_000 });
    await execFileAsync("npm", ["run", "build"], { cwd, timeout: 300_000 });
  } catch (err) {
    return { ok: false, error: describeExecError(err) };
  }

  // Only a process manager restarting us on exit makes this useful; outside
  // production, leave the (now up to date, rebuilt) process running instead
  // of killing a dev server.
  if (process.env.NODE_ENV === "production") {
    // Give the HTTP response time to flush to the client before exiting.
    setTimeout(() => process.exit(0), 500);
  }
  return { ok: true };
}
