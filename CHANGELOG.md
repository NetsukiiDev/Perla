# Changelog

## Non rilasciato

### Added
- **Tunnel Cloudflare**, come alternativa a ngrok per esporre il server di sviluppo in modo sicuro — utile quando la rete o l'antivirus blocca specificamente ngrok (vedi il fix qui sotto per il caso reale che ha portato a questa funzione). Nuove schede **Account → Tunnel Cloudflare** (avvia/ferma il proprio, con un token opzionale per un tunnel con nome — senza, parte un Quick Tunnel anonimo, nessun account richiesto, con un link diretto alla dashboard Cloudflare per crearne uno) e **Impostazioni → Tutti i tunnel Cloudflare** (supervisione admin di tutti gli utenti), identiche nella forma alla coppia già esistente per ngrok. Il binario `cloudflared` non richiede installazione manuale: viene scaricato in automatico al primo avvio (pacchetto `cloudflared` su npm, stesso principio con cui `@ngrok/ngrok` include già il proprio binario)

### Fixed
- **Il tunnel ngrok non si avviava affatto su una rete con Norton 360 attivo**, con errore `tls handshake error`: Norton intercetta il traffico HTTPS con un proprio certificato (confermato con una prova diretta: una `SSLKEYLOGFILE` iniettata nell'ambiente puntava a una pipe di Norton), e il trust store imbustato nel binario ngrok non lo riconosce — nemmeno impostando `NGROK_ROOT_CAS=host`, perché il componente di rete di Norton resta attivo a livello di driver anche a servizio "Firewall" fermato, finché non si riavvia Windows. Il Tunnel Cloudflare qui sopra è la via d'uscita: binario diverso, stesso risultato
- Lo stato di un tunnel (ngrok o Cloudflare) avviato in sviluppo poteva risultare "non attivo" nella richiesta immediatamente successiva a quella che lo aveva avviato, anche col processo perfettamente sano — `next dev` (Turbopack) può rivalutare il modulo di una route tra una richiesta e l'altra, azzerando silenziosamente una `Map` tenuta a livello di modulo invece che su `globalThis` (lo stesso motivo per cui `lib/db.ts` mette lì il client Prisma). Corretto per entrambi i provider
- **Eliminare un utente (o qualsiasi altra azione "distruttiva": revocare un codice, eliminare un evento o un annuncio, azioni sessione, aggiornamento app) poteva sembrare non fare nulla.** Il pulsante di conferma usava `window.confirm()`, il dialogo nativo del browser — inaffidabile in alcuni browser/ambienti (viene chiuso automaticamente o bloccato senza alcun errore visibile), lo stesso problema già risolto per la rigenerazione della API Key in questa release. Sostituita con una conferma a due click integrata nel pulsante stesso: il primo click lo "arma" (colore pieno, ben visibile), il secondo entro qualche secondo conferma davvero — corregge il problema ovunque nel pannello in una volta sola, non solo per gli utenti

## 0.2.11 — 2026-07-26

### Changed
- Aggiornate tre dipendenze npm segnalate da Dependabot per vulnerabilità note (incluse `next` 16.2.9 → 16.2.11 e `prisma` 7.8 → 7.9)
- **Lo switch di branch è stato rifatto: l'elenco ora arriva dall'API di GitHub**, non più da `git branch -a`. Quello locale mostra solo ciò che l'ultimo `fetch` aveva portato: su questa installazione elencava sei branch, di cui **quattro inesistenti su GitHub** (una `dependabot` già mergiata e cancellata, due `vercel/…`) più una voce spuria `origin` — mentre una branch pushata cinque minuti prima non sarebbe comparsa affatto. Il pannello si aggiorna da solo ogni 20 secondi, ha un pulsante per forzare il refresh, mostra il commit di ogni branch e segnala quando la copia locale è su un commit diverso da GitHub. Se GitHub non è raggiungibile ripiega sull'elenco locale, dicendolo esplicitamente
- Il cambio branch ora esegue prima `git fetch`, così funziona anche verso una branch **mai clonata in locale**, e allinea con `git merge --ff-only`: se la copia locale ha commit che il remoto non ha, si ferma con un errore invece di scartarli o creare un merge. Opzionale `GITHUB_TOKEN` per alzare il limite di richieste all'API GitHub (60/ora per IP senza autenticazione)

### Added
- **`npm run release <versione>`**: controlla che l'albero sia pulito e che la versione sia davvero successiva, data l'intestazione `## Non rilasciato` del changelog, scrive `package.json` e `VERSION` e crea gli stessi due commit di ogni rilascio. `npm run release -- --publish` fa il resto: push del branch, merge su `master`, tag **sul commit di merge** (dove stanno tutti i tag precedenti), push del tag e release GitHub con le note generate. Finora erano nove passaggi a mano, con il dettaglio non ovvio che un tag messo sul branch di sviluppo non sarebbe raggiungibile da `master` — vedi [Versioning](docs/wiki/Versioning.md)

### Fixed
- **Il file `VERSION` era una seconda fonte di verità che nessuno leggeva**: non veniva usato dal codice (`lib/version.ts` legge `package.json`), né dai docs, né dalla CI, né da script di deploy — ma andava aggiornato a mano a ogni rilascio, quindi prima o poi sarebbe divergito in silenzio. Ora lo scrive solo `npm run release`, insieme a `package.json`
- Impostazioni → Versione mostrava sempre **"N/A" come commit** nelle installazioni self-hosted: veniva letto solo da `VERCEL_GIT_COMMIT_SHA`, che esiste soltanto su Vercel. Ora, fuori da Vercel, il commit viene chiesto a git — cioè proprio dove serve, ora che dallo stesso pannello si cambia branch

## 0.2.10 — 2026-07-26

### Fixed
- **Lo switch di branch poteva ricostruire con le dipendenze sbagliate.** Per decidere se rilanciare `npm ci` veniva letto l'output di `git pull`, che però descrive solo ciò che il pull ha portato: dopo `git checkout <altra-branch>` il pull dice quasi sempre "Already up to date." mentre è stato il checkout a cambiare `package.json`. In produzione il rebuild partiva con i `node_modules` della branch precedente. Ora la differenza viene chiesta a git, tra il commit di partenza e HEAD — vale anche per il normale "Aggiorna ora"
- Il nome della branch arrivava a `git checkout` senza controlli: viaggiava come argomento separato (nessuna shell, quindi niente injection), ma `-f` avrebbe scartato le modifiche locali e uno SHA qualsiasi avrebbe lasciato il repo in detached HEAD con il `git pull --ff-only` successivo in errore. Ora sono accettati solo i nomi che git stesso ha appena elencato
- L'avviso "`APP_URL` non impostata" veniva scritto nei log a ogni richiesta proveniente da un indirizzo locale — cioè a ogni redirect al login durante un normale `next dev`, dove peraltro non esiste un indirizzo pubblico da indicare. Ora compare una sola volta per processo, come warning e non come errore

## 0.2.9 — 2026-07-26

### Fixed
- Lo **switch di branch** ora elenca anche i branch remote (non solo locali): sul VPS dove il repo ha solo `master` come branch locale, la `Dev` ora appare come opzione disponibile

## 0.2.8 — 2026-07-26

_Version bump — vedi 0.2.7 per le novità di questa release._

## 0.2.7 — 2026-07-26

### Added
- Impostazioni → Versione: lo **switch di branch** (es. Dev ↔ master). Mostra la branch attuale e un pulsante per passare all'altra branch disponibile. Il cambio esegue `git checkout` + `git pull`, rigenera Prisma e, in produzione, riavvia il server con la nuova versione

### Fixed
- **`APP_URL` veniva ignorata quando l'host non era localhost.** Il reverse proxy sul VPS (nginx, Caddy) termina HTTPS e si connette a Next.js su HTTP — l'header `X-Forwarded-Proto` mancava o era `http`, quindi `requestOrigin` costruiva URL `http://` anche quando il dominio pubblico era HTTPS. Ora `APP_URL` ha priorità assoluta quando è impostata, indipendentemente dall'host della richiesta. Per attivare il bot Telegram sul VPS, aggiungi `APP_URL=https://perla.netsukii.it` al `.env`

## 0.2.6 — 2026-07-26

### Added
- Nuovo **bot Telegram** per creare e gestire i codici invito senza aprire il pannello admin: `/eventi`, `/usa`, `/nuovo`, `/pubblico`, `/lista`, `/revoca`, `/rigenera` — vedi [Telegram Bot](docs/wiki/Telegram-Bot.md) per la configurazione. Autenticazione tramite una nuova **API Key personale**, generabile da Account → API (admin e organizzatori), con gli stessi permessi già in vigore nel pannello (gli organizzatori vedono solo i propri eventi)
- Impostazioni → nuova scheda **Telegram**: token del bot e secret del webhook si configurano da qui (cifrati nel database), non più solo tramite `.env`
- Impostazioni → Telegram: sezione **Webhook** con pulsante **Registra webhook** (e Rimuovi), più lo stato letto da Telegram — se il webhook è registrato su questo indirizzo, su un altro, o non è registrato affatto. Prima la registrazione richiedeva un comando `curl` eseguito a mano, da ripetere a ogni cambio di URL pubblico

### Fixed
- **Il bot Telegram non rispondeva ai messaggi.** Due cause, entrambe silenziose: il secret del webhook era facoltativo nel form, quindi si poteva salvare una configurazione "abilitata" ma inutilizzabile (senza secret ogni chiamata di Telegram veniva rifiutata con 401, senza traccia nei log del perché); e la registrazione del webhook presso Telegram era un passaggio manuale non evidente, senza il quale Telegram non consegna nulla. Ora il secret viene generato automaticamente se lasciato vuoto, la registrazione si fa dal pannello, e una configurazione abilitata ma incompleta lo scrive nei log del server
- Se una chiamata all'API di Telegram falliva (token revocato, chat inesistente, rete assente), l'errore veniva ignorato: `fetch` non solleva eccezioni sugli errori HTTP e la risposta non veniva controllata. Ora la descrizione dell'errore restituita da Telegram finisce nei log del server
- La rigenerazione della chiave API (Account → API) non funzionava in alcuni casi: il pulsante usava la finestra di conferma nativa del browser (`window.confirm()`), inaffidabile in alcuni browser/ambienti. Sostituita con una conferma interna alla pagina
- Il messaggio "Riprova alle {ora}" mostrato ai partecipanti prima dell'attivazione delle posizioni indicava solo l'orario, mai la data — per un'attivazione impostata su un giorno diverso da oggi (es. tra una settimana) sembrava riferirsi a "più tardi oggi". Ora mostra anche la data quando l'attivazione non è nel giorno corrente, su una riga separata dalla frase precedente per maggiore leggibilità

## 0.2.5 — 2026-07-18

### Fixed
- Il supporto a Cloudflare Tunnel (evitare redirect HTTPS in loop) e la nuova variabile `APP_URL` (per costruire link corretti dietro un reverse proxy che si connette in locale, es. Cloudflare Tunnel) erano finora una patch locale non versionata su una singola installazione self-hosted — ogni aggiornamento che toccava `proxy.ts` falliva lì con un conflitto Git. Ora fanno parte del codice normale, documentate in [Configuration](docs/wiki/Configuration.md)

## 0.2.4 — 2026-07-18

### Added
- La schermata di consenso posizione del partecipante mostra ora anche lo **Stato** (es. "Germania"), oltre alla Regione — solo testo, senza una seconda silhouette

### Fixed
- La **Slovenia** era l'unico paese UE mancante dal rilevamento regione (introdotto nella v0.1.5): le coordinate al suo interno restituivano sempre "regione non riconosciuta", bloccando la creazione di eventi lì
- Il messaggio d'errore "coordinate non riconosciute" non menziona più solo Italia/Spagna, ormai fuorviante con tutti i paesi supportati
- Se la password SMTP salvata non è più leggibile (es. dopo una rigenerazione della chiave di cifratura), l'email di recupero password falliva in silenzio — l'admin vedeva sempre "email inviata" ma il messaggio non arrivava mai. Ora il pulsante "Invia email di test" in Impostazioni mostra un errore chiaro che invita a salvare di nuovo la password, invece di un errore SMTP criptico
- **"Password dimenticata?" non faceva nulla**: `/admin/forgot-password` e `/admin/reset-password` erano bloccate dietro l'autenticazione come le altre pagine admin, quindi chi non riusciva ad accedere veniva rimandato dritto al login invece di poter richiedere il reset — ora sono pubbliche, come `/admin/login`

### Changed
- Tabella "Tutti i tunnel" (Impostazioni → admin): colonne a larghezza fissa così il pulsante Avvia/Ferma resta sempre visibile senza dover scorrere orizzontalmente, anche con URL ngrok lunghi
- Testi della sezione Tunnel ngrok (Account) riscritti per spiegare più chiaramente lo scopo (esporre il server tramite un dominio secondario, senza condividere il dominio principale) e senza più menzionare `.env`
- Nella card di consenso posizione del partecipante, Stato ora sopra e Regione sotto
- L'email di recupero password ha ora lo stesso tema scuro del resto dell'app invece di uno sfondo bianco generico; corretto anche il testo in fondo, che riusava per errore il messaggio "link scaduto" invece di indicare la validità di 1 ora

## 0.2.3 — 2026-07-18

### Added
- Il ruolo **Staff** è stato sostituito da **Organizzatore**: ogni organizzatore crea e gestisce solo i propri eventi (dati, partecipanti, biglietti/codici, annunci, live, sessioni) — non vede né può accedere agli eventi di altri organizzatori (404, non un generico "accesso negato"). Gli admin continuano a vedere e gestire tutto
- Gli organizzatori non hanno più accesso alla pagina **Impostazioni** (bloccata sia lato pagina che su tutte le route API sottostanti); i controlli **Lingua** e **Layout navigazione**, prima dentro Impostazioni, sono stati spostati nella pagina **Account**, raggiungibile da tutti
- Pagina di modifica evento: gli admin possono ora (ri)assegnare il **Proprietario** di un evento da un menu a tendina — utile anche per gli eventi creati prima di questo aggiornamento, che non hanno un proprietario noto e per default sono visibili solo agli admin
- Il **Tunnel ngrok** è ora per-utente invece che condiviso: ogni admin e ogni organizzatore configura ed avvia il proprio tunnel in modo indipendente (proprio authtoken/dominio, propria sessione avviata/fermata), spostato da Impostazioni alla pagina **Account** così anche gli organizzatori possono usarlo per testare la geolocalizzazione da un telefono reale
- Impostazioni → nuova scheda **Tutti i tunnel**: gli admin vedono lo stato del tunnel ngrok di ogni admin e organizzatore (configurato o no, attivo o no, URL pubblico) e possono avviarlo/fermarlo per conto loro, usando il token già salvato da quell'utente
- Pagina **Account** riorganizzata in schede (Profilo, Preferenze, Tunnel ngrok) invece di un unico elenco verticale

### Breaking change per installazioni self-hosted
Questo aggiornamento include la prima modifica di schema del database realmente "breaking" mai distribuita tramite l'auto-update: l'enum dei ruoli passa da `admin`/`staff` a `admin`/`organizer`, la tabella eventi guadagna una colonna proprietario, e la configurazione ngrok passa da una riga singola condivisa a una riga per utente. Il self-update (`git pull` + rigenerazione del client Prisma) **non** esegue mai `npm run db:push` in autonomia — dopo aver aggiornato un'installazione self-hosted esistente, va lanciato manualmente:
```
npm run db:push
```
Se il database ha già utenti con ruolo `staff`, prima di restringere l'enum va eseguita una migrazione dati (allargare l'enum a `('admin','staff','organizer')`, `UPDATE admin_users SET role='organizer' WHERE role='staff'`, poi restringere). Se esiste già una configurazione ngrok salvata (riga con `id='default'` nella tabella `ngrok_config`), va assegnata manualmente a un admin esistente prima di restringere la nuova colonna `admin_user_id` (altrimenti `db:push` la segnala come perdita di dati e la riga va persa). Chi parte da un'installazione nuova, senza utenti `staff` o senza una configurazione ngrok già salvata non deve fare nulla di più del solito `db:push`.

## 0.2.2 — 2026-07-18

### Fixed
- Se il token ngrok salvato non è più leggibile (es. dopo una rigenerazione della chiave di cifratura), ora appare un messaggio chiaro che invita a salvarlo di nuovo, invece di un errore generico

## 0.2.1 — 2026-07-18

### Fixed
- Il tunnel ngrok ora si può avviare anche su un deploy in produzione self-hosted (es. un VPS), utile per chi vuole tenere sia un Cloudflare Tunnel sia ngrok attivi contemporaneamente. Resta bloccato solo su Vercel, dove non c'è un processo persistente in grado di mantenere il tunnel attivo
- Il salvataggio della configurazione ngrok ora registra l'errore reale nei log del server invece di mostrare solo un messaggio generico

## 0.2.0 — 2026-07-17

### Added
- La versione dell'app (es. **v0.2.0**) è ora visibile accanto alla scritta **PERLA** nella barra admin, in piccolo e in grigio, senza dover aprire Impostazioni → Versione

## 0.1.8 — 2026-07-17

### Fixed
- **"Aggiorna ora" poteva rompere la build in produzione**: `npm ci` durante il self-update eredita `NODE_ENV=production` dal processo in esecuzione, quindi salta le `devDependencies` — ma `tailwindcss`, `@tailwindcss/postcss`, `typescript` e i pacchetti `@types/*` servono a `next build` stesso (elaborazione CSS + controllo tipi), non solo allo sviluppo locale. Spostati in `dependencies`
- Il client Prisma generato (non versionato) viene ora rigenerato dopo ogni pull, non solo quando cambia `package.json` — una modifica al solo `schema.prisma` non lo attivava, lasciando tipi non aggiornati rispetto ai nuovi campi

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
