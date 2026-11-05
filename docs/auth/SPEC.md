# SPEC - Autenticazione senza librerie

Stato: approvata (Nov 5, 2026) · passi 1-3 completati · Area dello scope: Account · Milestone 2

## Perché

Lo scope della v1 chiede "sessioni in cookie HttpOnly scritte da te, senza librerie di autenticazione", seguendo The Copenhagen Book. L'implementazione attuale usa Better Auth, che nasconde proprio le parti che il portfolio deve dimostrare: hashing delle password, token di sessione, scadenza e rinnovo, protezione CSRF, rate limiting. Questa spec descrive come sostituire Better Auth con codice nostro.

"Senza librerie di autenticazione" significa: niente Better Auth, Lucia, Passport, bcrypt/argon2 come pacchetti. Si usano solo il modulo `node:crypto` di Node e le librerie generiche già presenti (Express, Zod, Drizzle, `cookie-parser`).

## Obiettivi

- Registrazione, login, logout, eliminazione dell'account con email e password.
- Sessione server-side in tabella `sessions`, token casuale nel cookie, nel database solo il suo hash.
- Nessuna dipendenza di autenticazione nel `package.json` di `server/` e `client/`.
- Il contratto verso il resto dell'app non cambia: `requireAuth` continua a mettere `req.user` e `req.session`, `currentUser(req)` continua a esistere, `GET /api/me` risponde allo stesso modo.

## Fuori da questa spec

Restano fuori, perché lo scope li mette in v2 o nel resto della v1:

- Verifica dell'email, reset della password, login con Google (v2).
- Cambio password dal profilo.
- Controllo delle password compromesse (Have I Been Pwned).
- Schermata per impostare o cambiare il nome: il nome resta vuoto alla registrazione.
- Account demo: qui si prepara solo il campo `is_demo` e la possibilità di avere utenti senza password. L'endpoint arriva con i dati finti.
- Rate limiting su Redis (laboratorio post-v1): qui il limitatore è in memoria.

## Decisioni di progetto

### Token di sessione

- Il token è 24 byte da `crypto.randomBytes`, codificati in base64url. Va solo nel cookie.
- Nel database si salva `sessions.id = SHA-256(token)` in esadecimale. Chi legge il database non può ricostruire un cookie valido.
- Il confronto avviene cercando la riga per hash, quindi non serve `timingSafeEqual`: il token ha entropia alta e l'hash è deterministico.

### Cookie

| Attributo | Valore |
| --- | --- |
| Nome | `coppr_session` (in produzione `__Host-coppr_session`) |
| `HttpOnly` | sempre |
| `Secure` | solo in produzione |
| `SameSite` | `Lax` |
| `Path` | `/` |
| `Max-Age` | 30 giorni |

Il prefisso `__Host-` richiede `Secure`, `Path=/` e nessun `Domain`, quindi si usa solo in produzione.

### Scadenza e rinnovo

- Alla creazione la sessione dura 30 giorni.
- A ogni richiesta autenticata, se mancano meno di 15 giorni alla scadenza, `expires_at` riparte da 30 giorni e il cookie viene riemesso. Sessione che scade = riga cancellata e risposta 401.
- Un job che pulisce le sessioni scadute non serve in v1: la riga scaduta si cancella quando viene letta. Se la tabella cresce, si aggiunge un `DELETE ... WHERE expires_at < now()` all'avvio.

### Password

- Hash con `crypto.scrypt` (asincrono, non blocca l'event loop), parametri OWASP: `N = 2^16`, `r = 8`, `p = 2`, chiave da 64 byte, sale da 16 byte casuali, `maxmem` impostato esplicitamente (128 MB circa).
- Formato salvato in `users.password_hash`, nello stile PHC: `scrypt$N$r$p$saleBase64$hashBase64`. I parametri stanno nella stringa, così in futuro si possono alzare e rifare l'hash al login riuscito.
- Verifica con `crypto.timingSafeEqual`.
- Regole: normalizzazione Unicode NFKC, minimo 8 e massimo 128 caratteri, nessuna regola di composizione (maiuscole, simboli).
- Login con email inesistente: si esegue comunque una verifica contro un hash fittizio, così il tempo di risposta non rivela se l'utente esiste.

### Email

- `trim()` e minuscolo prima di ogni uso. Il vincolo `users_email_lowercase` nel database c'è già.
- La registrazione con email già usata risponde 409 con un messaggio chiaro. Senza verifica email in v1 non si può nascondere l'esistenza dell'account in modo sensato, e la UX conta più dell'enumerazione su un'app personale. Il rate limiting limita l'abuso.

### CSRF

- `SameSite=Lax` blocca il cookie sulle richieste cross-site non di navigazione.
- In più, un middleware sulle richieste `POST`, `PUT`, `PATCH`, `DELETE` verifica che l'header `Origin` coincida con `FRONTEND_URL`, altrimenti 403.
- Le rotte accettano solo `Content-Type: application/json`.

### Rate limiting

Limitatore in memoria scritto a mano (mappa chiave → contatore con finestra), in `server/src/auth/rate-limit.ts`:

| Rotta | Chiave | Limite |
| --- | --- | --- |
| `POST /api/auth/login` | IP + email | 5 ogni minuto |
| `POST /api/auth/login` | IP | 20 ogni minuto |
| `POST /api/auth/register` | IP | 3 ogni minuto |

Risposta 429 con header `Retry-After`. Richiede `app.set("trust proxy", ...)` in produzione dietro Railway. Vale solo su una singola istanza; il passaggio a Redis è già nel laboratorio post-v1.

### Modello dati

Lo schema torna a quello dello scope, più `is_demo`:

| Tabella | Campi |
| --- | --- |
| `users` | `id`, `name` (nullable, da 1 a 50 caratteri), `email` (unica, minuscola), `password_hash` (nullable), `is_demo`, `created_at` |
| `sessions` | `id` (hash del token), `user_id`, `expires_at`, `created_at` |

- Vincolo su `users`: `is_demo OR password_hash IS NOT NULL`. Solo l'utente demo può esistere senza password.
- Il nome è facoltativo: la registrazione non lo chiede, si imposta in seguito. L'interfaccia mostra `name`, e se manca l'email.
- Si eliminano `accounts` e `verifications` e le colonne `email_verified`, `image`, `updated_at` di `users`, le colonne `token`, `ip_address`, `user_agent`, `updated_at` di `sessions`. `sessions.id` passa da `uuid` a `text`.
- Migrazione Drizzle Kit versionata (regola 7). I dati di sviluppo esistenti vengono scartati: gli hash di Better Auth non sono compatibili e non c'è nessun utente reale.
- `ON DELETE CASCADE` da `sessions` verso `users` resta: l'eliminazione dell'account cancella anche le sessioni.

## API

Tutte le risposte di errore hanno la forma `{ "error": "messaggio" }`. L'input è validato con Zod prima di toccare il database.

| Metodo e percorso | Auth | Corpo | Risposta |
| --- | --- | --- | --- |
| `POST /api/auth/register` | no | `{ email, password }` | 201 `{ id, email, name }` + cookie. 409 email già usata, 400 input non valido |
| `POST /api/auth/login` | no | `{ email, password }` | 200 `{ id, email, name }` + cookie. 401 credenziali errate (messaggio unico) |
| `POST /api/auth/logout` | sì | - | 204, riga cancellata, cookie azzerato |
| `GET /api/me` | sì | - | 200 `{ id, email }` (invariato nella forma) |
| `DELETE /api/account` | sì | `{ password }` | 204, utente cancellato in cascata, cookie azzerato. 401 password errata |

L'id dell'utente non arriva mai dal client: viene sempre dalla sessione.

## Struttura del codice (server)

Organizzata per funzionalità, in `server/src/auth/`:

```
auth/
  password.ts       hashPassword, verifyPassword (scrypt)
  session.ts        token, hash e scadenza (puro, testabile senza database)
  session-store.ts  createSession, validateSession, deleteSession (database)
  cookie.ts         set e clear del cookie, nome e attributi
  schemas.ts        schemi Zod di registrazione e login
  rate-limit.ts     limitatore in memoria
  csrf.ts           middleware di controllo Origin
  require-auth.ts   legge il cookie, valida la sessione, imposta req.user (esiste già)
  routes.ts         register, login, logout, me, DELETE account
```

Da rimuovere: `server/src/auth.ts`, le dipendenze `better-auth` (server e client), `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL` da `.env.example`. `FRONTEND_URL` resta e passa a `server/src/config.ts`. `app.ts` perde `toNodeHandler` e il vincolo di ordine rispetto a `express.json()`. `email.ts` non serve più finché non arriva il reset password (v2): si elimina e si ricrea in v2.

`express.d.ts` si aggiorna con i tipi `User` e `Session` derivati dallo schema Drizzle.

## Struttura del codice (client)

- `lib/auth-client.ts` viene sostituito da un `AuthProvider` con contesto React e un hook `useSession()` che espone `{ user, isPending }`. Chiama `GET /api/me` all'avvio tramite `apiFetch`.
- `login(email, password)`, `register(email, password)`, `logout()` sono funzioni che usano `apiFetch` e aggiornano il contesto. Nessun dato di sessione in `localStorage`: la sessione vive solo nel cookie.
- `AuthGate`, `LoginForm`, `RegisterForm`, `SignOutButton` restano con la stessa interfaccia verso `App.tsx`. Cambia la sorgente dei dati.
- `RegisterForm` perde il campo nome (si imposta in seguito) e `AppHeader` mostra `name ?? email`.
- Gli schemi Zod di `features/auth/schemas.ts` restano e vengono duplicati lato server in `schemas.ts`. È la duplicazione che un pacchetto condiviso eliminerebbe: se ne riparla alla milestone Transazioni.
- Una risposta 401 su `/api/me` non è un errore da mostrare: significa "non autenticato" e porta al login.
- Nuovo: eliminazione dell'account, con dialog di conferma che richiede la password (componente `Dialog` già presente).

## Piano di lavoro

Ogni passo si chiude con test verdi e un commit. Ordine pensato per non lasciare mai l'app rotta a metà.

1. **Primitive, con test unitari** (Vitest): `password.ts` (hash e verifica, formato, parametri nella stringa, password sbagliata, hash malformato) e `session.ts` (generazione token, hash, scadenza, rinnovo sotto i 15 giorni, sessione scaduta).
2. **Migrazione dello schema**: nuove tabelle `users` e `sessions` secondo lo scope, rimozione di `accounts` e `verifications`, vincolo `is_demo OR password_hash IS NOT NULL`. Generata con `drizzle-kit generate`, applicata in locale.
3. **Rotte e middleware**: `schemas.ts`, `cookie.ts`, `csrf.ts`, `rate-limit.ts`, `routes.ts` (register, login, logout), nuovo `requireAuth`. In questo passo Better Auth è ancora nel progetto ma non più montato.
4. **Test di integrazione** sul server avviato su porta effimera con `fetch`, senza dipendenze nuove, contro un database di test (`DATABASE_URL_TEST`):
   - registrazione, login e `/api/me` con cookie;
   - cookie con `HttpOnly`, `SameSite=Lax`, scadenza a 30 giorni;
   - logout invalida davvero la sessione (dopo il logout `/api/me` dà 401, anche riusando il vecchio cookie);
   - email duplicata (409), email in maiuscolo trattata come minuscola;
   - credenziali errate: stesso messaggio per email inesistente e password sbagliata;
   - `Origin` diverso da `FRONTEND_URL` su una `POST` dà 403;
   - sesto login in un minuto dà 429 con `Retry-After`;
   - nessuna risposta o log contiene password, hash, token o cookie.
5. **Client**: `AuthProvider` e `useSession`, funzioni login, register e logout, aggiornamento di `AuthGate`, form e header. Verifica a mano nel browser del flusso completo.
6. **Eliminazione dell'account**: `DELETE /api/account` con conferma password, test di integrazione (utente e sessioni spariti), dialog nel client.
7. **Pulizia**: rimozione di `better-auth` da entrambi i `package.json`, di `server/src/auth.ts`, delle variabili d'ambiente inutili, di `email.ts`. Aggiornamento di `CLAUDE.md` (sezione Autenticazione, regola sul gestore montato prima di `express.json()`) e dello scope (Better Auth non più usato, monorepo, note sulle decisioni qui sotto).
8. **Chiusura**: build e lint di client e server, `NEXT.md` con il passo successivo (categorie predefinite e transazioni).

## Criteri di accettazione

- [ ] `grep -ri "better-auth"` non trova nulla nel repository, tranne la storia di git e questo documento.
- [ ] Nessun pacchetto di autenticazione in `server/package.json` e `client/package.json`.
- [ ] Registrazione, login, logout, `/api/me` ed eliminazione dell'account funzionano dal browser.
- [ ] Nel database `sessions.id` è un hash, mai il token del cookie; `users.password_hash` è nel formato `scrypt$...`.
- [ ] Il cookie ha `HttpOnly`, `SameSite=Lax`, `Secure` in produzione.
- [ ] Tutti i test del passo 4 passano; build e lint senza errori.
- [ ] Nessun dato di sessione in `localStorage`; ogni chiamata passa da `apiFetch`.
- [ ] `CLAUDE.md` e lo scope descrivono lo stato reale.

## Decisioni prese

1. **Il nome resta, facoltativo.** Colonna `name` nullable, non richiesta alla registrazione e impostata in seguito. Finché manca, l'interfaccia mostra l'email.
2. **`email.ts` si elimina** al passo 7. Senza verifica e reset nella v1 non viene mai chiamato. Si ricrea in v2.
3. **scrypt invece di Argon2id**, confermato. The Copenhagen Book raccomanda Argon2id, ma `crypto.argon2` non esiste in Node 22 (la versione in uso nel progetto) e per usarlo servirebbe un pacchetto esterno. scrypt è in `node:crypto` da sempre ed è nella lista OWASP. Se si passa a una versione di Node che include Argon2, si cambia solo `password.ts`: il formato PHC con i parametri nella stringa lo permette.
4. **Limitatore in memoria.** Basta per una sola istanza su Railway e viene sostituito da Redis nel laboratorio post-v1.
