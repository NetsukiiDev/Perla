# Configuration

## Variabili d'ambiente

### Obbligatorie

| Variabile | Scopo |
|---|---|
| `DATABASE_URL` | Stringa di connessione al database |
| `DATABASE_PROVIDER` | `postgresql` \| `mysql` \| `mariadb` \| `mongodb` (default `postgresql`) |
| `ENCRYPTION_KEY` | Chiave AES-256 (**base64, 32 byte**) per le coordinate cifrate |
| `HASH_PEPPER` | Pepper per l'hash lookup dei codici (**hex, 32 byte**) |
| `ADMIN_SESSION_SECRET` | Firma del cookie di sessione admin (**hex, 32 byte**) |
| `PARTICIPANT_SESSION_SECRET` | Firma del cookie di sessione partecipante (**hex, 32 byte**) |
| `CRON_SECRET` | Bearer token per `/api/cron/retention` (**hex, 32 byte**) |

Genera i segreti:

```bash
openssl rand -base64 32   # ENCRYPTION_KEY
openssl rand -hex 32      # gli altri segreti
```

> ⚠️ `ENCRYPTION_KEY` e `HASH_PEPPER` vanno **mantenuti stabili**: cambiarli rende illeggibili i dati già cifrati/hashati.

### Opzionali

| Variabile | Default | Scopo |
|---|---|---|
| `ROUTE_PROVIDER` | `osrm` | `osrm` \| `openrouteservice` \| `google-routes` |
| `OSRM_BASE_URL` / `OSRM_PROFILE` | server pubblico / `driving` | Endpoint OSRM |
| `OPENROUTESERVICE_API_KEY` / `*_BASE_URL` / `*_PROFILE` | — | Config openrouteservice |
| `GOOGLE_ROUTES_API_KEY` / `*_BASE_URL` / `*_TRAVEL_MODE` | — | Config Google Routes |
| `TOLL_ESTIMATE_EUR_PER_KM` | `0.08` | Tariffa media per la [stima pedaggio](Toll-Estimate) |
| `LOCATION_RETENTION_HOURS` | `24` | TTL delle posizioni temporanee |
| `SETUP_DISABLED` | — | `"true"` per bypassare il wizard (serverless/prod) |

## Database

| Provider | `DATABASE_PROVIDER` | Adapter |
|---|---|---|
| PostgreSQL | `postgresql` | `@prisma/adapter-pg` |
| MySQL | `mysql` | `@prisma/adapter-mariadb` |
| MariaDB | `mariadb` | `@prisma/adapter-mariadb` |
| MongoDB | `mongodb` | Nessuno (driver nativo) |

Cambiare provider dopo l'avvio:

```bash
DATABASE_PROVIDER=mariadb npm run db:generate
DATABASE_PROVIDER=mariadb npm run db:push
```

Lo script `scripts/prisma-provider.mjs` adatta lo schema Prisma al provider scelto (per MongoDB rimuove `@db.*` e converte `onDelete: SetNull` → `NoAction`).

## Provider di routing

Tutti i provider implementano la stessa interfaccia `RouteProvider` (`lib/route-provider/types.ts`). La suddivisione in tappe lavora sulla **polyline reale** e forza l'ultima tappa a coincidere con la destinazione cifrata. Solo OSRM popola anche i dati per la [stima pedaggio](Toll-Estimate).
