import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { signUp } from "@/lib/auth-client"
import { FormField } from "./FormField"
import { fieldErrors, registerSchema, type FieldErrors } from "./schemas"

type Values = { name: string; email: string; password: string }

export function RegisterForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const [errors, setErrors] = useState<FieldErrors<Values>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const parsed = registerSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)))
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    setErrors({})

    setPending(true)
    const { error } = await signUp.email({
      ...parsed.data,
      // Dove riporta il link di verifica dell'email
      callbackURL: window.location.origin,
    })
    setPending(false)

    if (error) {
      // Messaggio neutro: non confermiamo se l'email è già registrata
      setFormError(
        error.status === 429
          ? "Troppi tentativi, riprova tra un minuto"
          : "Non è stato possibile creare l'account. Se hai già un account, accedi.",
      )
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Crea un account</CardTitle>
        <CardDescription>Ti invieremo un link per verificare l'email</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="grid gap-4">
          <FormField id="name" label="Nome" autoComplete="name" error={errors.name} />
          <FormField id="email" label="Email" type="email" autoComplete="email" error={errors.email} />
          <FormField
            id="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="Almeno 8 caratteri"
            error={errors.password}
          />
          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
        </CardContent>
        <CardFooter className="mt-6 flex flex-col gap-2">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creazione in corso…" : "Registrati"}
          </Button>
          <Button type="button" variant="link" onClick={onSwitchToLogin}>
            Hai già un account? Accedi
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
