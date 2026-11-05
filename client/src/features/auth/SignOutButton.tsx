import { LogOut } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { signOut } from "@/lib/auth-client"

export function SignOutButton() {
  const [pending, setPending] = useState(false)

  async function handleClick() {
    setPending(true)
    // Il server elimina la sessione e il cookie; useSession si aggiorna da solo
    await signOut()
    setPending(false)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={pending}>
      <LogOut data-icon="inline-start" />
      Esci
    </Button>
  )
}
