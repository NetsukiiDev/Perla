# PERLA — Private Encrypted Route & Location Access

Real-time, secure, anonymous location sharing — trackable only by organizers. Participants receive a code to access a multi-stop route with geolocation; sensitive data (coordinates, IP) is end-to-end encrypted.

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-20232a?logo=react&logoColor=61dafb">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white">
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-7-2d3748?logo=prisma&logoColor=white">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=white">
  <br>
  <img alt="Database" src="https://img.shields.io/badge/DB-PostgreSQL%20%C2%B7%20MySQL%20%C2%B7%20MariaDB%20%C2%B7%20MongoDB-336791">
  <img alt="i18n" src="https://img.shields.io/badge/i18n-8%20languages-blue">
  <img alt="Encryption" src="https://img.shields.io/badge/crypto-AES--256--GCM-success">
  <img alt="License" src="https://img.shields.io/badge/license-Proprietary-lightgrey">
</p>

Organizers create events with a **secret destination**, split them into **intermediate stops**, and share a **code** with each participant. The participant sees only the current stop on the map; the organizer tracks everyone in real time on a live dashboard. Typical use cases: treasure hunts, rallies, guided tours, surprise events, relay races.

## ✨ Features

| | Feature |
|---|---|
| 🔐 | **Encrypted** destination & waypoints — the participant only ever sees the current stop |
| 🎟️ | **One-time** device-bound codes **+ public codes** reusable by many people |
| 📡 | **Live dashboard** — each participant's position, stop and status in real time |
| 🛣️ | **Highway + toll** estimate on the route (free, per-event) |
| 🗺️ | Destinations across **46 European countries**, with a region-silhouette location hint |
| 🌍 | **Multilingual** UI in 8 languages (IT/EN/ES/FR/DE/PT/NL/PL) with a language switcher |
| 🖥️ | **Settings**, versioning and update checks |
| 🗄️ | 4 databases (PostgreSQL · MySQL · MariaDB · MongoDB) + setup wizard |
| ☁️ | **Vercel**-ready with an in-app guide and `.env` generator |

## 📸 Screenshots

**Participant experience**

<table>
<tr>
<td align="center"><img src="docs/screenshots/home-mobile.png" alt="Inserimento codice" width="230"><br><sub>Code entry — the only thing a participant sees before authenticating</sub></td>
<td align="center"><img src="docs/screenshots/participant-consent-mobile.png" alt="Consenso posizione" width="230"><br><sub>Location consent, with the region-silhouette hint instead of a map</sub></td>
<td align="center"><img src="docs/screenshots/participant-map-mobile.png" alt="Percorso in tempo reale" width="230"><br><sub>Current stop only — satellite/dark map toggle, distance, time, tolls</sub></td>
</tr>
</table>

**Admin dashboard**

<table>
<tr>
<td width="33%"><img src="docs/screenshots/admin-login.png" alt="Accesso amministratore"><br><sub>Admin login</sub></td>
<td width="33%"><img src="docs/screenshots/admin-events.png" alt="Elenco eventi"><br><sub>Events list</sub></td>
<td width="33%"><img src="docs/screenshots/admin-event-new.png" alt="Nuovo evento"><br><sub>New event — map picker, geocoding, schedule</sub></td>
</tr>
<tr>
<td width="33%"><img src="docs/screenshots/admin-event-overview.png" alt="Panoramica evento"><br><sub>Event overview — codes, route, destination</sub></td>
<td width="33%"><img src="docs/screenshots/admin-event-participants.png" alt="Partecipanti e codici"><br><sub>Participants & codes — personal and public</sub></td>
<td width="33%"><img src="docs/screenshots/admin-event-live.png" alt="Live tracking"><br><sub>Live dashboard — everyone's position in real time</sub></td>
</tr>
<tr>
<td width="33%"><img src="docs/screenshots/admin-users.png" alt="Utenti amministratori"><br><sub>Admin/organizer users & roles</sub></td>
<td width="33%"><img src="docs/screenshots/admin-account.png" alt="Account"><br><sub>Account — profile, preferences, ngrok tunnel, API key</sub></td>
<td width="33%"><img src="docs/screenshots/admin-settings.png" alt="Impostazioni"><br><sub>Settings — version, updates, branch switcher, integrations</sub></td>
</tr>
</table>

## 🏗️ Architecture

```mermaid
flowchart TB
  P["Participant<br/>(mobile browser)"]
  A["Organizer<br/>(admin dashboard)"]

  subgraph app ["PERLA - Next.js (App Router)"]
    direction TB
    PF["Participant flow /c"]
    PROJ["public-projection<br/>(single public boundary)"]
    GUARD["admin-guard"]
    API["API routes"]
  end

  DB[("Encrypted database<br/>PostgreSQL / MySQL<br/>MariaDB / MongoDB")]
  ROUTE["Route provider<br/>OSRM / ORS / Google"]

  P -->|"one-time / public code"| PF
  PF --> PROJ
  PROJ -.->|"current stop only"| P
  A --> GUARD --> API
  API --> DB
  PROJ --> DB
  API -->|"compute route"| ROUTE
```

## 🚀 Quick start

```bash
npm install
cp .env.example .env
npm run db:generate
npm run dev
```

Open **http://localhost:3000** — on first run you're guided to the **`/admin/setup`** wizard (database + first admin). On Vercel the wizard is replaced by an in-app guide.

## 📚 Documentation

Full documentation lives in the **[Wiki](https://github.com/NetsukiiDev/Perla/wiki)**:

- [Getting Started](https://github.com/NetsukiiDev/Perla/wiki/Getting-Started) — install & first run
- [Configuration](https://github.com/NetsukiiDev/Perla/wiki/Configuration) — env vars, database, routing
- [Architecture](https://github.com/NetsukiiDev/Perla/wiki/Architecture) — diagrams & internals
- [Public Codes](https://github.com/NetsukiiDev/Perla/wiki/Public-Codes) · [Toll Estimate](https://github.com/NetsukiiDev/Perla/wiki/Toll-Estimate) · [Internationalization](https://github.com/NetsukiiDev/Perla/wiki/Internationalization) · [Versioning](https://github.com/NetsukiiDev/Perla/wiki/Versioning)
- [Deploy on Vercel](https://github.com/NetsukiiDev/Perla/wiki/Deploy-on-Vercel)
- [Security](https://github.com/NetsukiiDev/Perla/wiki/Security) — encryption & invariants
- [Troubleshooting](https://github.com/NetsukiiDev/Perla/wiki/Troubleshooting)

> Wiki sources are versioned in [`docs/wiki/`](docs/wiki) and published with [`scripts/publish-wiki.sh`](scripts/publish-wiki.sh).

## License

Proprietary. All rights reserved.
