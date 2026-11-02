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
