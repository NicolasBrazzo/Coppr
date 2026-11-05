import { AuthGate } from "@/features/auth/AuthGate"
import { SignOutButton } from "@/features/auth/SignOutButton"
import { useSession } from "@/lib/auth-client"
import Styleguide from "@/pages/Styleguide"

function AppHeader() {
  const { data } = useSession()
  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-background px-4 py-3">
      <p className="truncate text-sm text-muted-foreground">
        Ciao, <span className="font-medium text-foreground">{data?.user.name}</span>
      </p>
      <SignOutButton />
    </header>
  )
}

export default function App() {
  return (
    <AuthGate>
      <AppHeader />
      <Styleguide />
    </AuthGate>
  )
}
