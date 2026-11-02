# Coppr - Scope della v1

Oct 29, 2026 · @Nicolas

## Obiettivo

La v1 è un money tracker personale, pensato per il telefono, in cui registrare una spesa richiede meno di 5 secondi. Serve a farti trovare lavoro come sviluppatore: è il pezzo forte del portfolio, non ancora un prodotto da vendere.

- **Per chi**: una persona che gestisce i propri soldi da sola. Niente conti condivisi.
- **Partenza**: Jan 11, 2027. **Online entro**: May 2, 2027, cioè 16 settimane.
- **Tempo a disposizione**: circa 70 ore in tutto, a 4-5 ore a settimana.
- **Prima di gennaio**: novembre e dicembre vanno bene per le interviste agli utenti (Fase 0) e per leggere react.dev, senza scrivere codice.

## Cosa entra nella v1

La v1 ha 8 aree. Ognuna contiene il minimo che la rende utile e che dimostra una competenza a chi valuta il portfolio.

| Area | Cosa include | Cosa dimostra |
| --- | --- | --- |
| Account | Registrazione, login e logout con email e password. Sessioni in cookie HttpOnly scritte da te, senza librerie di autenticazione. Eliminazione dell'account | Sicurezza di base fatta bene |
| Account demo | Un pulsante "Prova la demo" in home, che apre un account con 3 mesi di dati finti | Chi valuta il portfolio vede l'app senza registrarsi |
| Transazioni | Aggiungere, modificare ed eliminare spese ed entrate (importo, categoria, data, nota). Inserimento rapido con tastierino numerico e ultima categoria già selezionata. Lista per mese con il totale | UX dei form, il cuore del progetto |
| Categorie | 10 categorie predefinite con icona, rinominabili. Niente sottocategorie | Modello dati pulito |
| Budget | Un limite mensile per categoria, con una barra che mostra quanto è stato usato | Calcoli corretti sugli importi |
| Dashboard | Entrate, uscite e saldo del mese. Grafico delle spese per categoria. Andamento degli ultimi 6 mesi | Visualizzazione dei dati |
| AI | Scrivi "esselunga 23,40" e l'app propone importo, categoria e data, che confermi con un tocco. Viene misurata su 50 casi di prova | AI applicata a un problema reale, con le evals |
| Esperienza | Tema chiaro e scuro con design token. App installabile sul telefono (senza modalità offline). Micro-animazioni sull'inserimento | Cura del frontend e del design |

C'è una sola valuta, l'euro.

## Cosa resta fuori

Tutto quello che segue è una buona idea, ma non entra nella v1. **Regola anti-espansione**: una funzione nuova entra solo se ne togli un'altra di peso simile.

**v2, subito dopo il lancio**

- Spese ricorrenti, come affitto e abbonamenti (job in background)
- Import del CSV della banca
- Scontrino letto da una foto
- Avvisi quando un budget sta per finire
- Reset della password via email e login con Google

**Più avanti**

- Chat sulle spese, agenti e server MCP
- Ricerca semantica
- Più conti, trasferimenti e valute diverse
- Modalità offline con sincronizzazione
- Conti condivisi per coppie e famiglie
- Animazioni avanzate, 3D, Rive e video di lancio
- Abbonamento a pagamento (e quindi la partita IVA)

## Stack tecnico e regole fisse

Lo stack resta sul terreno che conosci, React ed Express, con TypeScript ovunque. Le novità sono poche e scelte apposta.

| Livello | Scelta | Note |
| --- | --- | --- |
| Struttura | Un solo repository con `web` e `api` (pnpm workspaces) | Lo schema Zod sta in un pacchetto condiviso |
| Frontend | React + Vite + TypeScript strict | Routing con React Router |
| Stile | Variabili CSS come design token, più Tailwind o CSS Modules a tua scelta | I token rendono il tema scuro quasi gratis |
| Animazioni | GSAP | Solo micro-interazioni, rispettando `prefers-reduced-motion` |
| Grafici | Recharts |  |
| Backend | Express + TypeScript |  |
| Database | PostgreSQL + Drizzle | In locale Postgres in Docker, in produzione Postgres su Railway |
| Autenticazione | Sessioni scritte a mano, seguendo The Copenhagen Book |  |
| AI | Claude API con un modello piccolo e output strutturato | Prompt e dataset di prova versionati nel repository |
| Test | Vitest + Playwright | Un solo test E2E sul flusso principale è già sufficiente |
| Deploy | Railway (piano Hobby), deploy da GitHub con Dockerfile, test in GitHub Actions | Errori tracciati con Sentry |

**Regole fisse**

1. Gli importi sono sempre interi in centesimi. Si formattano solo quando vengono mostrati.
2. TypeScript strict, zero `any`.
3. Uno schema Zod unico, usato da form, API e output dell'AI.
4. Ogni feature parte da un `SPEC.md`. Ogni sessione finisce aggiornando `NEXT.md` con il passo successivo.
5. Il file `CLAUDE.md` del progetto contiene stack, convenzioni e queste regole.
6. Il backend è organizzato per funzionalità (`auth/`, `transactions/`, `budgets/`), non per tipo di file.
7. Ogni modifica allo schema è una migrazione Drizzle Kit versionata nel repository, mai una modifica a mano sul database.
8. La lista delle transazioni è paginata fin dalla v1.

## Modello dati di partenza

Bastano 5 tabelle. Ogni dato appartiene a un utente, quindi ogni query filtra per `user_id`.

| Tabella | Campi principali | Collegata a |
| --- | --- | --- |
| `users` | `id`, `email` (unica), `password_hash`, `created_at` | — |
| `sessions` | `id`, `user_id`, `expires_at` | `users` |
| `categories` | `id`, `user_id`, `name`, `icon`, `kind` (spesa o entrata) | `users` |
| `transactions` | `id`, `user_id`, `category_id`, `amount_cents` (intero positivo), `kind` (spesa o entrata), `occurred_on` (data), `note`, `created_at` | `users`, `categories` |
| `budgets` | `id`, `user_id`, `category_id`, `month` (es. `2027-03`), `limit_cents` | `users`, `categories` |

**Deciso**: l'importo è sempre positivo e il tipo sta in `kind`, che vale `expense` o `income`. La UI legge `kind` per decidere colore e segno. Questa soluzione è migliore di un booleano `isPositive` per due motivi: le query si leggono da sole (`WHERE kind = 'expense'`) e nella v2 basta aggiungere `transfer` senza cambiare lo schema.

**A cosa serve `sessions`**: al login il server crea una riga e mette nel cookie solo un token casuale. A ogni richiesta cerca quella riga per capire chi sei. Al logout la riga viene cancellata, quindi la sessione smette davvero di esistere, e puoi chiudere in un colpo tutte le sessioni di un utente. Nel database salvi l'hash del token, mai il token in chiaro.

**Indice da creare subito**: `transactions(user_id, occurred_on)` per la lista mensile e la dashboard.

## Milestone

Le milestone sono 6 in 16 settimane. Ognuna si chiude con qualcosa che funziona online, non con codice lasciato a metà.

&#91;embedded content: milestone della v1 · 6 fasi in 16 settimane\]

1. **Fondamenta** (3 settimane): repository, TypeScript strict, `CLAUDE.md` e hook, database con lo schema, CI e un primo deploy, anche vuoto.
2. **Account e demo** (2 settimane): registrazione, login, logout, eliminazione dell'account, account demo con i dati finti.
3. **Transazioni** (3 settimane): inserimento rapido, modifica, eliminazione, lista mensile con il totale.
4. **Dashboard e budget** (3 settimane): grafici, saldo del mese, budget per categoria.
5. **Categorizzazione AI** (2 settimane): dataset di 50 casi, prompt, conferma con un tocco.
6. **Rifinitura e test** (3 settimane): tema scuro, animazioni, accessibilità, performance, test E2E, README.

Se salta una settimana, il calendario slitta di una settimana. Va bene così: conta l'ordine, non le date.

## Quando la v1 è finita

La v1 è finita quando tutte queste caselle sono spuntate, non quando ti sembra perfetta.

- [ ] Online su un dominio vero, con HTTPS
- [ ] La demo si apre dalla home con un clic, già piena di dati
- [ ] Una spesa si registra da telefono in meno di 5 secondi, cronometrati su 5 prove
- [ ] Lighthouse su mobile: accessibilità 100, performance almeno 90
- [ ] Il test E2E registrazione, spesa, dashboard passa in CI a ogni push
- [ ] La categorizzazione AI è corretta in almeno 45 casi su 50
- [ ] Il README ha screenshot, una GIF di 30 secondi del flusso principale, le scelte architetturali motivate e cosa faresti nella v2
- [ ] Il link al progetto è nel CV e su LinkedIn

## Dopo la v1: laboratorio su Redis e microservizi

Tra giugno e luglio 2027, a v1 online, il progetto diventa un laboratorio per imparare Redis e i microservizi su un'app che funziona già. L'obiettivo è capire cosa migliorano e cosa complicano, non riscrivere l'app.

**Redis**, in ordine di difficoltà:

- [ ] Rate limiting su login e chiamate AI, con `INCR` ed `EXPIRE`
- [ ] Cache dei totali della dashboard, invalidata a ogni nuova transazione
- [ ] Spese ricorrenti con BullMQ, che funziona sopra Redis

**Microservizi**: estrarre un solo servizio, la categorizzazione AI.

- [ ] Servizio separato con il suo deploy su Railway, collegato tramite rete privata
- [ ] Comunicazione provata in due modi, chiamata HTTP e messaggio in coda, e confrontata
- [ ] Se il servizio è giù, l'app propone la categoria manuale (timeout, retry, fallback)
- [ ] Una richiesta tracciata attraverso i due servizi con correlation ID e OpenTelemetry
- [ ] `docker-compose` in locale con API, servizio AI, Redis e Postgres
- [ ] ADR finale: cosa è migliorato, cosa è peggiorato, e quale architettura terresti

**Dove studiare**: [Redis University](https://university.redis.io), la documentazione di BullMQ, *Monolith to Microservices* di Sam Newman, l'articolo "MonolithFirst" di Martin Fowler.
