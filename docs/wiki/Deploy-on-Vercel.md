# Deploy on Vercel

The project is **Vercel-ready** (`vercel.json` + `vercel-build` script). The setup wizard does **not** work on Vercel (read-only filesystem): configuration happens via **Environment Variables**, with an **in-app guide** at `/admin/setup`.

## 1. Connect the repository

1. [vercel.com](https://vercel.com) → **Add New Project** → import `NetsukiiDev/Perla` (or your fork).
2. Framework auto-detected → **Next.js**. No build override needed.

## 2. Environment Variables

Set at least these (see [Configuration](Configuration) for details):

| Variable | Value |
|---|---|
| `SETUP_DISABLED` | `true` |
| `DATABASE_PROVIDER` | `postgresql` \| `mysql` \| `mariadb` |
| `DATABASE_URL` | connection string |
| `ENCRYPTION_KEY` | `openssl rand -base64 32` |
| `HASH_PEPPER` | `openssl rand -hex 32` |
| `ADMIN_SESSION_SECRET` | `openssl rand -hex 32` |
| `PARTICIPANT_SESSION_SECRET` | `openssl rand -hex 32` |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `ROUTE_PROVIDER` | `osrm` |

> 💡 The `/admin/setup` guide includes an **`.env` generator/exporter**: you can download or copy a ready file and use **Import .env** on Vercel.

## 3. Prepare the database

From your machine, pointing at the production DB:

```bash
export DATABASE_PROVIDER=postgresql
export DATABASE_URL=postgresql://...
npm run db:generate
npx prisma db push
npx tsx prisma/seed.ts   # create the first admin
```

> ⚠️ **MariaDB/MySQL**: the DB must accept remote TCP connections. Add the [Vercel IP ranges](https://vercel.com/docs/security/firewall#ip-range) to your firewall, or use a cloud DB.

## 4. Deploy & verify

1. **Production Branch**: `master` → **Deploy**.
2. Open `https://<project>.vercel.app/admin/setup` → **Verify connection** → create the admin.

The build runs: `prisma-provider.mjs` → `prisma generate` → `next build`.

## Common problems

See [Troubleshooting](Troubleshooting).
