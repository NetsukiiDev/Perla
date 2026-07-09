# PERLA — Private Encrypted Route & Location Access

> Condivisione di posizioni in tempo reale, sicura e anonima, tracciabile solo dagli organizzatori.
> Real-time, secure, anonymous location sharing — trackable only by organizers.

PERLA permette a un organizzatore di creare eventi con una **destinazione segreta**, suddividerli in **tappe intermedie** e condividere un **codice** con ogni partecipante. Il partecipante vede solo la tappa corrente sulla mappa; l'organizzatore segue tutti in tempo reale su una dashboard live.

Casi d'uso: cacce al tesoro, rally, tour guidati, eventi a sorpresa, staffette.

## 🧭 Naviga la wiki

| Pagina | Contenuto |
|---|---|
| [Getting Started](Getting-Started) | Installazione, primo avvio, wizard di setup |
| [Configuration](Configuration) | Variabili d'ambiente, database, provider di routing |
| [Architecture](Architecture) | Diagrammi, flusso partecipante, invarianti di sicurezza |
| [Public Codes](Public-Codes) | Codici pubblici riusabili da più persone |
| [Toll & Highway Estimate](Toll-Estimate) | Stima autostrada + pedaggio |
| [Internationalization](Internationalization) | Sistema i18n Italiano / English |
| [Versioning & Updates](Versioning) | Versione, changelog, controllo aggiornamenti |
| [Deploy on Vercel](Deploy-on-Vercel) | Deploy passo-passo su Vercel |
| [Security](Security) | Modello di sicurezza e crittografia |
| [Troubleshooting](Troubleshooting) | Problemi comuni e soluzioni |

## ⚡ In breve

```bash
npm install
cp .env.example .env
npm run db:generate
npm run dev
```

Poi apri **http://localhost:3000** — al primo avvio verrai guidato al wizard **`/admin/setup`**.

> ℹ️ La documentazione completa e sempre aggiornata è nel [README del repository](https://github.com/NetsukiiDev/Perla#readme).
