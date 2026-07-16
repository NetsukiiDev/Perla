# Changelog

## 0.1.4 — 2026-07-16

### Added
- Pagina **Impostazioni** (`/admin/settings`) con selettore lingua e info versione
- Supporto multilingua **Italiano / Inglese / Spagnolo** (i18n con cookie `locale` + dizionari)
- Supporto eventi in **Spagna** oltre che in Italia: rilevamento regione (comunità autonome), silhouette di localizzazione e stima autostrada/pedaggio (autopistas `AP-*`/`R-*` a pedaggio, autovías `A-*` gratuite)
- Pulsante **"Aggiorna ora"** in Impostazioni → Versione (solo admin): trigger opzionale via `DEPLOY_HOOK_URL` (webhook esterno) o `SELF_UPDATE_ENABLED` (git pull + rebuild in-process, richiede un process manager per il riavvio)
- Branding **PERLA** con simbolo perla al posto di "Eventi" in alto a sinistra nel pannello admin
- Controllo aggiornamenti: confronta la versione locale con l'ultima release GitHub, mostra info build/commit
- Codici **pubblici** riusabili da più persone, senza scadenza, con tetto massimo di utilizzi (ogni persona è un "Ospite" tracciato singolarmente)
- Stima **autostrada + costo pedaggio** nella vista partecipante (euristica gratuita, toggle per evento)
- Guida configurazione **Vercel** con generatore/esportazione `.env`
- Pulsanti Panoramica/Partecipanti nella tabella eventi ed Elimina nel form di modifica

## 0.1.0 — 2026-07-06

### Added
- Setup wizard interattivo per database (PostgreSQL, MySQL, MariaDB, MongoDB) + creazione primo account admin
- Eventi con destinazione cifrata, percorso a tappe, tracking GPS in tempo reale
- Codici monouso con hash SHA‑256 + pepper, coordinate cifrate AES‑256‑GCM
- Sessione admin via cookie firmato JWT (jose/HS256), password bcrypt
- Rate limiting in-memory
- Dashboard live con mappa Leaflet (tile CARTO dark)
- Provider di routing: OSRM, openrouteservice, Google Routes
- Retention cron per pulizia dati posizione (TTL configurabile)
- Supporto MongoDB completo: schema transformation runtime, `MongoClient` connection test, `@prisma/adapter-pg`/`@prisma/adapter-mariadb` selettivo
- Pagina account admin (`/admin/account`) e gestione utenti (`/admin/users`) con ruoli `admin`/`staff`
- Sistema di versionamento (`VERSION`, `CHANGELOG.md`)

### Fixed
- Stallo setup: rilevamento configurazione sporca quando il DB viene resettato ma `.data/config.json` indica setup completato
- Crash admin layout su tabelle mancanti (`PrismaClientKnownRequestError`) ora gestito con redirect pulito al wizard
- Messaggi di errore nel wizard ora mostrano il testo reale del server invece di "Impossibile completare"
- Bottone submit con spinner di caricamento
- Provider MongoDB abilitato e funzionante nel wizard
- Riavvio forzato del server dopo cambio provider DB
- Placeholder "ravetools" rinominato in "perla"
- Eliminato `.env` con segreti compromessi, sostituito con `.env.example`

### Changed
- Nome progetto: **PERLA** (Private Encrypted Route & Location Access)
- Dev server: Turbopack → webpack (`--webpack`) per stabilità su Windows
- Script `db:reset` aggiunto per reset rapido DB + config
