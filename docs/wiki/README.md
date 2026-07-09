# docs/wiki — GitHub Wiki sources

These Markdown pages are the **versioned sources** of the [PERLA Wiki](https://github.com/NetsukiiDev/Perla/wiki). Keeping them in the repo allows review in PRs and reproducible publishing.

## Why aren't they already published?

A GitHub wiki **has no git repository until the first page is created** through the web UI, so it can't be initialized via `git push`.

## Publish the wiki (one-time, then automatic)

1. **First time only** — open <https://github.com/NetsukiiDev/Perla/wiki> → **Create the first page** → Save (any content).
2. Then, on every update, run from the project root:

   ```bash
   bash scripts/publish-wiki.sh
   ```

   The script clones the `*.wiki.git` repo, copies these files and pushes.

## Pages

| File | Wiki page |
|---|---|
| `Home.md` | Home |
| `Getting-Started.md` | Getting Started |
| `Configuration.md` | Configuration |
| `Architecture.md` | Architecture |
| `Public-Codes.md` | Public Codes |
| `Toll-Estimate.md` | Toll & Highway Estimate |
| `Internationalization.md` | Internationalization |
| `Versioning.md` | Versioning & Updates |
| `Deploy-on-Vercel.md` | Deploy on Vercel |
| `Security.md` | Security |
| `Troubleshooting.md` | Troubleshooting |
| `_Sidebar.md` | Navigation sidebar |
