# Changelog

## 0.1.7 — 2026-07-17

### Added
- Titolo obbligatorio per gli annunci, oltre al messaggio, mostrato sia nel pannello admin sia nella vista partecipante
- Modifica ed eliminazione degli annunci esistenti dal pannello admin (prima si potevano solo creare)
- Vista partecipante: ogni annuncio appare come scheda compatta (titolo + orario) con un pulsante **"Apri"** che mostra il messaggio completo e l'immagine in una finestra modale, invece di renderizzare tutto inline
- Nuova sezione **Tunnel ngrok** in Impostazioni: avvia/ferma un tunnel HTTPS pubblico verso il server di sviluppo direttamente dal pannello admin — utile per testare la geolocalizzazione della vista partecipante da un telefono reale — con authtoken cifrato a riposo e URL pubblico mostrato con pulsante copia
- Script `npm run dev:tunnel`: avvia il tunnel ngrok prima di `next dev`, così l'hostname è già noto all'avvio e non serve riavviare per superare la protezione `allowedDevOrigins` di Next.js

### Fixed
- La finestra modale degli annunci non appare più dietro la mappa nella vista partecipante (il pulsante di cambio stile mappa aveva uno z-index troppo alto senza un proprio contesto di stacking, lasciando passare anche i livelli interni di Leaflet)
- Le immagini verticali negli annunci non vengono più forzate a piena larghezza, evitando grandi spazi vuoti ai lati
- Gli annunci creati prima dell'introduzione del titolo (default vuoto) non mostrano più una riga in grassetto vuota
- Le email di test SMTP vengono ora inviate all'indirizzo dell'admin che le richiede invece che all'indirizzo "from" configurato, spesso una casella no-reply non monitorata

## 0.1.6 — 2026-07-17

### Changed
- **"Aggiorna ora"** ora funziona senza configurazione: l'auto-update via `git pull` è attivo di default (prima richiedeva `SELF_UPDATE_ENABLED=true`); `SELF_UPDATE_ENABLED=false` per disattivarlo. Fuori produzione salta la build/riavvio (evita di rompere `next dev`, che ricarica da solo i file scaricati); `npm ci` gira solo se il pull tocca `package.json`/`package-lock.json`

## 0.1.5 — 2026-07-16

### Added
- Supporto eventi esteso a **46 paesi dell'Europa geografica** (da 2 a 46): oltre a Italia e Spagna, tutta l'UE, Regno Unito, Norvegia/Svezia/Finlandia/Islanda, Baltici, Balcani, Ucraina/Bielorussia/Moldova, Caucaso (Georgia/Armenia/Azerbaijan), le parti europee di Russia e Turchia, e i microstati (Andorra, Monaco, San Marino, Vaticano, Liechtenstein) — 690 regioni/province/cantoni in totale, ciascuna con rilevamento confini, silhouette di localizzazione e fuso orario corretto (incluse le eccezioni: Canarie, Azzorre, Kaliningrad)
- Confini contesi trattati secondo il riconoscimento ONU: Crimea in Ucraina, Abkhazia/Ossezia del Sud in Georgia, Transnistria in Moldova, Nagorno-Karabakh in Azerbaijan, Cipro del Nord in Cipro (come distretto di Kyrenia), Kosovo come paese separato
- Architettura di rilevamento regione riorganizzata in un registro per-paese (`lib/regions/`) per scalare oltre le 2 nazioni iniziali; corretto un bug per cui un'enclave (es. Vienna dentro la Bassa Austria) veniva assegnata erroneamente alla regione che la circonda
- Stima autostrada/pedaggio ora distingue "in autostrada" da "a pedaggio" per paese: la maggior parte dei paesi mostra l'uso dell'autostrada ma pedaggio €0 (gratuite o a bollino, non a consumo), mentre Italia/Portogallo/Francia (formato `A#`) e Spagna (`AP-*`/`R-*`) mantengono la stima a km; riconosciute anche le autostrade britanniche/irlandesi (`M#`)
- Interfaccia disponibile in **5 nuove lingue** (francese, tedesco, portoghese, olandese, polacco), oltre a italiano/inglese/spagnolo — 8 lingue totali, stesso selettore in Impostazioni con rilevamento automatico della lingua del browser

### Known gaps
- Alcuni paesi con dati grezzi troppo granulari (Lettonia, Macedonia del Nord, Malta, Azerbaijan) sono trattati come una singola regione anziché suddivisi, per mancanza di una fonte dati per il livello amministrativo corretto

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
