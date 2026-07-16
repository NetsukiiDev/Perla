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

When an update is available, admins (not staff) see an **"Update now"** button next to the notice. It's a thin wrapper (`POST /api/admin/update`) around whichever mechanism is configured via environment variable — **both are off by default**, so adding this feature doesn't make anything happen on its own:

| Env var | Behavior |
|---|---|
| `DEPLOY_HOOK_URL` | POSTs to this URL and returns. Point it at a Vercel **Deploy Hook**, or any other CI/CD webhook that owns the actual rebuild — PERLA never touches the filesystem or process in this mode. Takes priority if both vars are set. |
| `SELF_UPDATE_ENABLED=true` | Runs `git pull --ff-only` → `npm ci` → `npm run build` in the running process, then exits. **Only use this if PERLA runs under a process manager (systemd, PM2, …) configured to restart on exit** — otherwise this just kills the server with nothing to bring it back. To avoid accidents, the process only exits when `NODE_ENV=production`; elsewhere it rebuilds but leaves the process running. |

If neither is set, the button is replaced with a note explaining how to enable one. Every attempt (success or failure) is written to the admin access log.

## Build info

- **Environment**: `vercel` in production on Vercel, otherwise `NODE_ENV`.
- **Commit**: from `VERCEL_GIT_COMMIT_SHA` (injected by Vercel) when available.

## Note

If the check shows *"Unable to check for updates"* locally, it's usually a **VPN/antivirus intercepting TLS** that prevents verifying GitHub's certificate. It's not a bug: on Vercel (no TLS interception) it works normally, and the failure degrades gracefully.
