import { API_URL } from "@/lib/env"

// Ogni chiamata all'API passa da qui, così il cookie di sessione viaggia sempre
export function apiFetch(path: string, init: RequestInit = {}) {
  return fetch(`${API_URL}${path}`, { ...init, credentials: "include" })
}
