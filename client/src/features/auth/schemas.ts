import { z } from "zod"

const email = z.email({ error: "Inserisci un indirizzo email valido" })

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: "Inserisci la password" }),
})

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Inserisci il tuo nome" })
    .max(50, { error: "Il nome può avere al massimo 50 caratteri" }),
  email,
  password: z
    .string()
    .min(8, { error: "La password deve avere almeno 8 caratteri" })
    .max(128, { error: "La password può avere al massimo 128 caratteri" }),
})

export type FieldErrors<T> = Partial<Record<keyof T, string>>

// Primo messaggio di errore per ciascun campo
export function fieldErrors<T>(error: z.ZodError<T>): FieldErrors<T> {
  const out: FieldErrors<T> = {}
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof T | undefined
    if (key !== undefined && !out[key]) out[key] = issue.message
  }
  return out
}
