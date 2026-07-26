# Versioning & Updates

The **Settings** page (`/admin/settings`) shows the **current version**, checks whether **updates** are available, and reports some **build info**.

## Version source

- There is a **single** version: the `version` field of `package.json` (exposed by `lib/version.ts`).
- `VERSION` is a plain-text mirror of it, for anything outside the app that wants the version without parsing JSON. **Never edit it by hand** — `npm run release` writes both, so the two can't drift.
- `CHANGELOG.md` documents changes following [SemVer](https://semver.org/).

## Cutting a release

While you work, put entries under a `## Non rilasciato` heading at the top of `CHANGELOG.md`. Then, from the development branch:

```bash
npm run release 0.2.11
```

That checks the working tree is clean and the version is really newer, dates the `Non rilasciato` heading, writes `package.json` + `VERSION`, and makes the same two commits every release has (`docs: finalize … changelog entry`, then `v…`). It stops there so you can review and run `npm run build`.

Then publish:

```bash
npm run release -- --publish
```

That pushes the branch, merges it into `master`, pushes `master`, tags **the merge commit** (where every previous release tag lives — a tag on the development branch would not be reachable from `master`), pushes the tag, and creates the GitHub release with generated notes. It returns you to the branch you started from.

A bump with nothing to document (a re-tag, a build-only fix) needs `npm run release 0.2.11 --allow-empty-changelog`, which writes the heading with a "version bump" note rather than leaving the version missing from the changelog.

Publishing the release is what makes other installations see **"update available"**: the check below reads the *latest GitHub release*, not the branch.

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

## Branch switcher

Settings → Version also shows which branch this checkout is on and lets an admin switch (e.g. `master` ↔ `Dev`).

The list comes from the **GitHub API**, not from `git branch -a`: the local answer is only ever as fresh as the last `git fetch`, so it both hides branches pushed since (they simply aren't there) and offers branches long deleted upstream. The panel refreshes itself every 20 seconds and has a manual refresh; the GitHub call behind it is cached for a minute server-side and shared across everyone with the tab open, which keeps it inside the unauthenticated rate limit (60/hour per IP — set [`GITHUB_TOKEN`](Configuration) to raise it). If GitHub can't be reached it falls back to the local list and says so.

Switching runs `git fetch`, `git checkout <branch>` (creating the local branch when it only exists on GitHub), then `git merge --ff-only origin/<branch>` — never a reset or a merge commit, so local commits the remote doesn't have stop the switch with an error instead of being discarded. It then reinstalls dependencies if `package.json`/`package-lock.json` differ between the two commits, regenerates the Prisma client, and in production rebuilds and exits for the process manager to restart (same tradeoff as self-update above).

It does **not** run `npm run db:push`: crossing a branch boundary that changes `prisma/schema.prisma` needs that by hand, exactly as an update does.

## Build info

- **Environment**: `vercel` in production on Vercel, otherwise `NODE_ENV`.
- **Commit**: from `VERCEL_GIT_COMMIT_SHA` (injected by Vercel) when available.

## Note

If the check shows *"Unable to check for updates"* locally, it's usually a **VPN/antivirus intercepting TLS** that prevents verifying GitHub's certificate. It's not a bug: on Vercel (no TLS interception) it works normally, and the failure degrades gracefully.
