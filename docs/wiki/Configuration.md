# Configuration

## Environment variables

### Required

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Database connection string |
| `DATABASE_PROVIDER` | `postgresql` \| `mysql` \| `mariadb` \| `mongodb` (default `postgresql`) |
| `ENCRYPTION_KEY` | AES-256 key (**base64, 32 bytes**) for encrypted coordinates |
| `HASH_PEPPER` | Pepper for code hash lookup (**hex, 32 bytes**) |
| `ADMIN_SESSION_SECRET` | Admin session cookie signing secret (**hex, 32 bytes**) |
| `PARTICIPANT_SESSION_SECRET` | Participant session cookie signing secret (**hex, 32 bytes**) |
| `CRON_SECRET` | Bearer token for `/api/cron/retention` (**hex, 32 bytes**) |

Generate the secrets:

```bash
openssl rand -base64 32   # ENCRYPTION_KEY
openssl rand -hex 32      # the other secrets
```

> ⚠️ Keep `ENCRYPTION_KEY` and `HASH_PEPPER` **stable**: changing them makes already-encrypted/hashed data unreadable.

### Optional

| Variable | Default | Purpose |
|---|---|---|
| `ROUTE_PROVIDER` | `osrm` | `osrm` \| `openrouteservice` \| `google-routes` |
| `OSRM_BASE_URL` / `OSRM_PROFILE` | public server / `driving` | OSRM endpoint |
| `OPENROUTESERVICE_API_KEY` / `*_BASE_URL` / `*_PROFILE` | — | openrouteservice config |
| `GOOGLE_ROUTES_API_KEY` / `*_BASE_URL` / `*_TRAVEL_MODE` | — | Google Routes config |
| `TOLL_ESTIMATE_EUR_PER_KM` | `0.08` | Average tariff for the [toll estimate](Toll-Estimate) |
| `LOCATION_RETENTION_HOURS` | `24` | TTL for temporary positions |
| `SETUP_DISABLED` | — | `"true"` to bypass the wizard (serverless/prod) |
| `DEPLOY_HOOK_URL` | — | Webhook POSTed by the Settings **"Update now"** button, taking priority over self-update (see [Versioning](Versioning)) |
| `SELF_UPDATE_ENABLED` | `"true"` (self-update is the zero-config default) | Set to `"false"` to disable **"Update now"**'s built-in `git pull` + rebuild instead of using it (see [Versioning](Versioning)) |

## Database

| Provider | `DATABASE_PROVIDER` | Adapter |
|---|---|---|
| PostgreSQL | `postgresql` | `@prisma/adapter-pg` |
| MySQL | `mysql` | `@prisma/adapter-mariadb` |
| MariaDB | `mariadb` | `@prisma/adapter-mariadb` |
| MongoDB | `mongodb` | None (native driver) |

Switch provider after first run:

```bash
DATABASE_PROVIDER=mariadb npm run db:generate
DATABASE_PROVIDER=mariadb npm run db:push
```

`scripts/prisma-provider.mjs` adapts the Prisma schema to the chosen provider (for MongoDB it strips `@db.*` and converts `onDelete: SetNull` → `NoAction`).

## Routing providers

All providers implement the same `RouteProvider` interface (`lib/route-provider/types.ts`). Waypoint splitting works on the **real polyline** and forces the last stop to match the encrypted destination. Only OSRM also populates data for the [toll estimate](Toll-Estimate).
