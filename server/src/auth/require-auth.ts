import type { NextFunction, Request, Response } from "express";
import { clearSessionCookie, readSessionToken, setSessionCookie } from "./cookie.js";
import { validateSession } from "./session-store.js";

// Da usare su ogni rotta che tocca dati dell'utente.
// L'utente arriva solo dalla sessione (cookie), mai da body, query o parametri.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = readSessionToken(req);
  const result = token ? await validateSession(token) : null;
  if (!token || !result) {
    if (token) clearSessionCookie(res);
    res.status(401).json({ error: "Non autenticato" });
    return;
  }
  // Rinnovata nel database: il cookie riparte con la stessa scadenza
  if (result.renewed) setSessionCookie(res, token, result.session.expiresAt);
  req.user = result.user;
  req.session = result.session;
  next();
}

// Per le rotte dietro requireAuth: restituisce l'utente già tipizzato come presente
export function currentUser(req: Request) {
  if (!req.user) throw new Error("currentUser usato su una rotta senza requireAuth");
  return req.user;
}

export function currentSession(req: Request) {
  if (!req.session) throw new Error("currentSession usato su una rotta senza requireAuth");
  return req.session;
}
