# Changelog

## Non rilasciato

### Added
- Supporto eventi in **10 nuovi paesi europei** (Germania, Austria, Polonia, Paesi Bassi, Belgio, Svizzera, Cechia, Slovacchia, Danimarca, Portogallo), oltre a Italia e Spagna già presenti — rilevamento regione/provincia/cantone, silhouette di localizzazione, fuso orario corretto per regione (incluse Canarie e Azzorre)
- Architettura di rilevamento regione riorganizzata in un registro per-paese (`lib/regions/`) per scalare oltre le 2 nazioni iniziali; corretto un bug per cui un'enclave (es. Vienna dentro la Bassa Austria) veniva assegnata erroneamente alla regione che la circonda
- Stima autostrada/pedaggio ora distingue "in autostrada" da "a pedaggio" per paese: Germania/Austria/Svizzera/Polonia/Paesi Bassi/Belgio/Cechia/Slovacchia/Danimarca mostrano l'uso dell'autostrada ma pedaggio €0 (gratuite o a bollino, non a consumo), mentre Italia/Portogallo (formato `A#`) e Spagna (`AP-*`/`R-*`) mantengono la stima a km

### Known gaps
- Ancora da coprire: Francia, Regno Unito, paesi nordici (oltre Danimarca), Baltici, Balcani, Europa orientale, Caucaso, Russia/Turchia europee, microstati — in arrivo in blocchi successivi
- Lingue interfaccia principali europee (francese, tedesco, portoghese, olandese, polacco) non ancora aggiunte

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
