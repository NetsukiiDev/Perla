# Troubleshooting

## Deploy / Database

| Symptom | Cause | Fix |
|---|---|---|
| `ECONNRESET` / "connection failed" | DB not reachable from Vercel | Open the firewall (Vercel IPs) or use a cloud DB |
| `ENOENT: schema.prisma` | Missing file tracing | Use the latest `next.config.ts` (already configured) |
| `DATABASE_URL not set` | `SETUP_DISABLED=true` but `DATABASE_URL` missing | Set the variable on Vercel |
| `prisma generate` fails | Provider mismatch | Check `DATABASE_PROVIDER` |

## Login / Setup

| Symptom | Cause | Fix |
|---|---|---|
| `ADMIN_SESSION_SECRET is not set` at login | Secrets missing from `.env` | Generate and add the 5 secrets (see [Configuration](Configuration)) |
| Site always redirects to `/admin/setup` | Setup not completed | Finish the wizard, or on Vercel set env vars + `SETUP_DISABLED=true` |
| "This code has already been used" | One-time code consumed by another device | Regenerate the code, or use a [public code](Public-Codes) |

## Settings / Updates

| Symptom | Cause | Fix |
|---|---|---|
| "Unable to check for updates" locally | VPN/antivirus intercepting TLS (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`) | Not a bug: works on Vercel. Disable TLS interception to test locally |
| Language doesn't change | `locale` cookie not set | Change language from **Settings**; make sure cookies aren't blocked |

## Routing / Route

| Symptom | Cause | Fix |
|---|---|---|
| "No route found" | Non-routable coordinates or OSRM unreachable | Check the coordinates; set a self-hosted `OSRM_BASE_URL` |
| Toll not shown | Provider ≠ OSRM, or toggle disabled | Use OSRM and enable "Show highway and toll" on the event |

If the problem persists, open an [issue](https://github.com/NetsukiiDev/Perla/issues).
