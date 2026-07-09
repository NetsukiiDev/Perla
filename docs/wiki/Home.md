# PERLA — Private Encrypted Route & Location Access

> Real-time, secure, anonymous location sharing — trackable only by organizers.

PERLA lets an organizer create events with a **secret destination**, split them into **intermediate stops**, and share a **code** with each participant. The participant sees only the current stop on the map; the organizer tracks everyone in real time on a live dashboard.

Use cases: treasure hunts, rallies, guided tours, surprise events, relay races.

## 🧭 Navigate the wiki

| Page | Content |
|---|---|
| [Getting Started](Getting-Started) | Install, first run, setup wizard |
| [Configuration](Configuration) | Environment variables, database, routing providers |
| [Architecture](Architecture) | Diagrams, participant flow, project structure |
| [Public Codes](Public-Codes) | Codes reusable by many people |
| [Toll & Highway Estimate](Toll-Estimate) | Highway + toll estimate |
| [Internationalization](Internationalization) | Italian / English i18n system |
| [Versioning & Updates](Versioning) | Version, changelog, update checks |
| [Deploy on Vercel](Deploy-on-Vercel) | Step-by-step Vercel deploy |
| [Security](Security) | Security model & encryption |
| [Troubleshooting](Troubleshooting) | Common problems & fixes |

## ⚡ In short

```bash
npm install
cp .env.example .env
npm run db:generate
npm run dev
```

Then open **http://localhost:3000** — on first run you're guided to the **`/admin/setup`** wizard.

> ℹ️ Quick overview: the [repository README](https://github.com/NetsukiiDev/Perla#readme).
