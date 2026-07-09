# docs/wiki — sorgenti della GitHub Wiki

Queste pagine Markdown sono i **sorgenti versionati** della [Wiki di PERLA](https://github.com/NetsukiiDev/Perla/wiki). Tenerle nel repo permette review nelle PR e pubblicazione riproducibile.

## Perché non sono già pubblicate?

Una wiki GitHub **non ha un repository git finché non si crea la prima pagina** dalla UI web. Non è quindi possibile inizializzarla via `git push`.

## Pubblicare la wiki (una tantum + poi automatico)

1. **Solo la prima volta** — apri <https://github.com/NetsukiiDev/Perla/wiki> → **Create the first page** → salva (qualsiasi contenuto).
2. Poi, ad ogni aggiornamento, esegui dalla root del progetto:

   ```bash
   bash scripts/publish-wiki.sh
   ```

   Lo script clona il repo `*.wiki.git`, copia questi file e fa push.

## Pagine

| File | Pagina wiki |
|---|---|
| `Home.md` | Home |
| `Getting-Started.md` | Getting Started |
| `Configuration.md` | Configuration |
| `Architecture.md` | Architecture |
| `Public-Codes.md` | Public Codes |
| `Toll-Estimate.md` | Toll & Highway Estimate |
| `Internationalization.md` | Internationalization |
| `Versioning.md` | Versioning & Updates |
| `Deploy-on-Vercel.md` | Deploy on Vercel |
| `Security.md` | Security |
| `Troubleshooting.md` | Troubleshooting |
| `_Sidebar.md` | Barra laterale di navigazione |
