# Coppr

Money tracker mobile-first. Frontend in `client/` (React + Vite + TypeScript, Tailwind v4, shadcn/ui su Base UI, icone Lucide). Backend in `server/` (Express + TypeScript).

L'app è dark-first: `<html class="dark">`. La fonte di verità per colori, font e forme è `docs/logo.html` (non va modificato).

## Design system

- I token di colore vivono solo in `client/src/index.css` (blocco `.dark`, e `:root` per il tema chiaro) e sono esposti a Tailwind in `@theme inline`.
- `client/src/pages/Styleguide.tsx` mostra tutti i token e le varianti dei componenti: aggiornala quando aggiungi un token o una variante.

## Regole

- Mai colori esadecimali o valori arbitrari (es. `bg-[#...]`) nei componenti: solo token.
- Nei componenti si usano nomi di significato (`income`, `expense`, `primary`), mai nomi di colore (rame, nichel). Solo `index.css` conosce i valori.
- I componenti shadcn si personalizzano modificando i file in `client/src/components/ui`, non con override sparsi.
- Entrate = `income`, uscite = `expense`, sempre.
- Gli importi sono interi in centesimi e si mostrano con `tabular-nums`.
- Ogni coppia testo/sfondo deve avere contrasto almeno 4.5:1.

## Autenticazione

Better Auth (`server/src/auth.ts`): email e password, sessioni di 30 giorni in un cookie httpOnly, tabelle `users`, `sessions`, `accounts`, `verifications` in `server/src/db/schema.ts`.

- Ogni rotta che tocca dati dell'utente usa `requireAuth` (`server/src/auth/require-auth.ts`).
- Ogni query su transazioni, categorie o conti filtra sempre per `req.user.id`.
- L'id dell'utente non arriva mai dal client (body, query, parametri), solo dalla sessione.
- Mai loggare password, token o cookie, nemmeno in sviluppo. I link delle email si loggano solo in sviluppo.
- Le email passano solo da `server/src/email.ts`.
- Nel client nessun dato di sessione in `localStorage`: la sessione vive solo nel cookie. Le chiamate all'API usano `apiFetch` (`client/src/lib/api.ts`), che invia sempre `credentials: "include"`.
- Il gestore di Better Auth va montato prima di `express.json()`.
