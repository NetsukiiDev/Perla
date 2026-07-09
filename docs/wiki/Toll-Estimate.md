# Toll & Highway Estimate

PERLA può mostrare al partecipante se il percorso **prevede autostrada** e una **stima del pedaggio**, attivabile **per singolo evento**.

## Attivazione

Nel form dell'evento, abilita **"Mostra autostrada e pedaggio stimato"**. Il dato viene calcolato all'avvio della sessione (dal punto di partenza del partecipante alla destinazione) e mostrato nella vista tappa.

## Come viene calcolato

Approccio **gratuito e senza chiavi API** (`lib/toll-estimate.ts`):

1. Il provider **OSRM** restituisce gli *step* del percorso con i riferimenti stradali (`ref`, es. `A1`, `A14`, `A1var`).
2. Vengono sommati i chilometri sui tratti autostradali (escludendo alcune "A" gratuite note: GRA, tangenziali di Milano, ecc.).
3. Il pedaggio è stimato come `km autostrada × tariffa`.

> ⚠️ È una **stima approssimata**: nessuna fonte gratuita fornisce il pedaggio esatto. La tariffa media è configurabile con `TOLL_ESTIMATE_EUR_PER_KM` (default `0.08` €/km).

## Esempio

Firenze → Bologna (via A1): ~84 km di autostrada → **~€6,7** stimati (reale ~€7–8).

## Limiti

- Funziona con il provider **OSRM** (default). Gli altri provider non popolano il pedaggio.
- L'euristica può sbagliare su raccordi/tangenziali con ref "A" ma senza pedaggio, o sottostimare tratti di montagna.
- Il valore è calcolato una sola volta all'avvio (come distanza/tempo), non ricalcolato durante il percorso.
