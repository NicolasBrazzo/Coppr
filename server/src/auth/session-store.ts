import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { sessions, users } from "../db/schema.js";
import { generateSessionToken, hashSessionToken, newSessionExpiry, sessionStatus } from "./session.js";

// Accesso al database delle sessioni. Separato da session.ts, che resta puro e testabile senza database.

export type AuthUser = { id: string; email: string; name: string | null; isDemo: boolean };
export type AuthSession = { id: string; userId: string; expiresAt: Date };

export async function createSession(userId: string) {
  const token = generateSessionToken();
  const expiresAt = newSessionExpiry();
  await db.insert(sessions).values({ id: hashSessionToken(token), userId, expiresAt });
  return { token, expiresAt };
}

// Una sola query: la sessione e il suo utente. La riga scaduta si cancella qui, quando viene letta
export async function validateSession(token: string) {
  const id = hashSessionToken(token);
  const [row] = await db
    .select({
      session: { id: sessions.id, userId: sessions.userId, expiresAt: sessions.expiresAt },
      user: { id: users.id, email: users.email, name: users.name, isDemo: users.isDemo },
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, id));
  if (!row) return null;

  const status = sessionStatus(row.session.expiresAt);
  if (status === "expired") {
    await deleteSession(id);
    return null;
  }

  const session: AuthSession = row.session;
  const user: AuthUser = row.user;
  if (status === "renew") {
    session.expiresAt = newSessionExpiry();
    await db.update(sessions).set({ expiresAt: session.expiresAt }).where(eq(sessions.id, id));
  }
  return { session, user, renewed: status === "renew" };
}

export async function deleteSession(sessionId: string) {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function deleteSessionByToken(token: string) {
  await deleteSession(hashSessionToken(token));
}
