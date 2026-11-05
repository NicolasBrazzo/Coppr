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
import { signIn } from "@/lib/auth-client"
import { FormField } from "./FormField"
import { fieldErrors, loginSchema, type FieldErrors } from "./schemas"

type Values = { email: string; password: string }

export function LoginForm({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  const [errors, setErrors] = useState<FieldErrors<Values>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const parsed = loginSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)))
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    setErrors({})

    setPending(true)
    const { error } = await signIn.email(parsed.data)
    setPending(false)

    if (error) {
      // Sempre lo stesso messaggio: non riveliamo se l'email è registrata
      setFormError(
        error.status === 429
          ? "Troppi tentativi, riprova tra un minuto"
          : "Email o password non corretti",
      )
    }
    // Con successo useSession si aggiorna e AuthGate mostra l'app
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Accedi</CardTitle>
        <CardDescription>Bentornato su Coppr</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="grid gap-4">
          <FormField id="email" label="Email" type="email" autoComplete="email" error={errors.email} />
          <FormField
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
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
            {pending ? "Accesso in corso…" : "Accedi"}
          </Button>
          <Button type="button" variant="link" onClick={onSwitchToRegister}>
            Non hai un account? Registrati
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
