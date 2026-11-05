import { createAuthClient } from "better-auth/react"
import { API_URL } from "@/lib/env"

// La sessione vive solo nel cookie httpOnly impostato dal server:
// niente token in localStorage.
export const authClient = createAuthClient({
  baseURL: API_URL,
  fetchOptions: { credentials: "include" },
})

export const { useSession, signIn, signUp, signOut } = authClient
