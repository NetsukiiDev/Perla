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

## Build info

- **Environment**: `vercel` in production on Vercel, otherwise `NODE_ENV`.
- **Commit**: from `VERCEL_GIT_COMMIT_SHA` (injected by Vercel) when available.

## Note

If the check shows *"Unable to check for updates"* locally, it's usually a **VPN/antivirus intercepting TLS** that prevents verifying GitHub's certificate. It's not a bug: on Vercel (no TLS interception) it works normally, and the failure degrades gracefully.
