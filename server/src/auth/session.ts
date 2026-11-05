import { createHash, randomBytes } from "node:crypto";

// Primitive pure delle sessioni (token, hash, scadenza). L'accesso al database arriva con le rotte.

const DAY_MS = 24 * 60 * 60 * 1000;

export const SESSION_DURATION_MS = 30 * DAY_MS;
// Quando mancano meno di 15 giorni, la scadenza riparte da 30
export const SESSION_RENEW_THRESHOLD_MS = 15 * DAY_MS;

// 24 byte casuali in base64url: è il valore che sta nel cookie, mai nel database
export function generateSessionToken() {
  return randomBytes(24).toString("base64url");
}

// Nel database si salva solo l'hash: chi legge la tabella non può ricostruire un cookie valido
export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function newSessionExpiry(now = new Date()) {
  return new Date(now.getTime() + SESSION_DURATION_MS);
}

export type SessionStatus = "expired" | "renew" | "valid";

export function sessionStatus(expiresAt: Date, now = new Date()): SessionStatus {
  const remaining = expiresAt.getTime() - now.getTime();
  if (remaining <= 0) return "expired";
  if (remaining < SESSION_RENEW_THRESHOLD_MS) return "renew";
  return "valid";
}
