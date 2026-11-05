import { fromNodeHeaders } from "better-auth/node";
import type { NextFunction, Request, Response } from "express";
import { auth } from "../auth.js";

// Da usare su ogni rotta che tocca dati dell'utente.
// L'utente arriva solo dalla sessione (cookie), mai da body, query o parametri.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const result = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!result) {
    res.status(401).json({ error: "Non autenticato" });
    return;
  }
  req.user = result.user;
  req.session = result.session;
  next();
}

// Per le rotte dietro requireAuth: restituisce l'utente già tipizzato come presente
export function currentUser(req: Request) {
  if (!req.user) throw new Error("currentUser usato su una rotta senza requireAuth");
  return req.user;
}
