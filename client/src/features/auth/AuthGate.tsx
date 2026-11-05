import { useState } from "react"

import { useSession } from "@/lib/auth-client"
import { LoginForm } from "./LoginForm"
import { RegisterForm } from "./RegisterForm"

// Protegge le schermate dell'app: senza sessione mostra l'accesso
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()
  const [mode, setMode] = useState<"login" | "register">("login")

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p role="status" className="text-sm text-muted-foreground">
          Caricamento…
        </p>
      </div>
    )
  }

  if (!session) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background px-4">
        {mode === "login" ? (
          <LoginForm onSwitchToRegister={() => setMode("register")} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setMode("login")} />
        )}
      </main>
    )
  }

  return <>{children}</>
}
