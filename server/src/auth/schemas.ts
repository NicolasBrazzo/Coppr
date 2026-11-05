import { z } from "zod";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "./password.js";

// Stessi messaggi dello schema del client (client/src/features/auth/schemas.ts)
const email = z
  .string({ error: "Inserisci un indirizzo email valido" })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Inserisci un indirizzo email valido" }));

export const registerSchema = z.object({
  email,
  password: z
    .string({ error: "Inserisci la password" })
    .min(PASSWORD_MIN_LENGTH, { error: `La password deve avere almeno ${PASSWORD_MIN_LENGTH} caratteri` })
    .max(PASSWORD_MAX_LENGTH, { error: `La password può avere al massimo ${PASSWORD_MAX_LENGTH} caratteri` }),
});

export const loginSchema = z.object({
  email,
  password: z
    .string({ error: "Inserisci la password" })
    .min(1, { error: "Inserisci la password" })
    .max(PASSWORD_MAX_LENGTH, { error: `La password può avere al massimo ${PASSWORD_MAX_LENGTH} caratteri` }),
});

// Primo messaggio di errore, per la risposta { error }
export function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Dati non validi";
}
