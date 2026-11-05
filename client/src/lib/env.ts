const apiUrl = import.meta.env.VITE_API_URL
if (!apiUrl) throw new Error("VITE_API_URL mancante: copia .env.example in .env")

export const API_URL: string = apiUrl
