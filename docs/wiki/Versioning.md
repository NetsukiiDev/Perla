# Versioning & Updates

The **Settings** page (`/admin/settings`) shows the **current version**, checks whether **updates** are available, and reports some **build info**.

## Version source

- There is a **single** version: the `version` field of `package.json` (exposed by `lib/version.ts`).
- `CHANGELOG.md` documents changes following [SemVer](https://semver.org/).

## Update check

The `GET /api/admin/version` endpoint (admin only):

1. Reads the local version.
2. Queries the **GitHub API** for the latest *release* (fallback: latest *tag*) of `NetsukiiDev/Perla`.
3. Compares with SemVer and returns `updateAvailable`.

Typical response:

```json
{
  "name": "PERLA",
  "version": "0.1.0",
  "latest": "0.1.0",
  "updateAvailable": false,
  "checkFailed": false,
  "commit": "…",
  "env": "vercel"
}
```

To surface "update available", publish a new **release/tag** on GitHub (e.g. `v0.2.0`) with a version higher than the one in `package.json`.

## Update now (auto-update)

When an update is available, admins (not organizers) see an **"Update now"** button next to the notice — it's on the Impostazioni page, which organizers can't reach at all. It's a thin wrapper (`POST /api/admin/update`) around whichever mechanism is active:

| Mode | When | Behavior |
|---|---|---|
| Deploy hook | `DEPLOY_HOOK_URL` is set | POSTs to this URL and returns. Point it at a Vercel **Deploy Hook**, or any other CI/CD webhook that owns the actual rebuild — PERLA never touches the filesystem or process in this mode. Takes priority over self-update. |
| Self-update | **Default** — active unless `DEPLOY_HOOK_URL` is set or `SELF_UPDATE_ENABLED=false` | Runs `git pull --ff-only`, then `npm ci` only if the pull touched `package.json`/`package-lock.json`. In **production** it also runs `npm run build` and exits, relying on a process manager (systemd, PM2, …) to restart it — **if nothing restarts the process, this kills the server**, the deliberate tradeoff for a zero-config "click Update, it's live". Outside production (e.g. local `next dev`) it skips the build/exit: the dev server's own file watcher picks up the pulled files, and running `next build` concurrently would corrupt the shared `.next` directory. |

Set `SELF_UPDATE_ENABLED=false` to disable self-update entirely (e.g. a hardened deployment where the app shouldn't be able to modify itself) and fall back to the "not configured" state. Every attempt (success or failure) is written to the admin access log.

## Build info

- **Environment**: `vercel` in production on Vercel, otherwise `NODE_ENV`.
- **Commit**: from `VERCEL_GIT_COMMIT_SHA` (injected by Vercel) when available.

## Note

If the check shows *"Unable to check for updates"* locally, it's usually a **VPN/antivirus intercepting TLS** that prevents verifying GitHub's certificate. It's not a bug: on Vercel (no TLS interception) it works normally, and the failure degrades gracefully.
