import type { NextFunction, Request, Response } from "express";
import { frontendUrl } from "../config.js";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Oltre a SameSite=Lax: le richieste che modificano dati devono arrivare dal frontend.
// Un Origin assente non basta: i browser lo inviano sempre su queste richieste
export function requireSameOrigin(req: Request, res: Response, next: NextFunction) {
  if (UNSAFE_METHODS.has(req.method) && req.get("origin") !== frontendUrl) {
    res.status(403).json({ error: "Origine non consentita" });
    return;
  }
  next();
}

// Un form HTML cross-site può inviare solo text/plain, urlencoded o multipart: accettando
// solo JSON si chiude anche quella strada. Le richieste senza corpo (es. logout) passano
export function requireJsonBody(req: Request, res: Response, next: NextFunction) {
  const hasBody =
    req.get("transfer-encoding") !== undefined || Number(req.get("content-length") ?? 0) > 0;
  if (hasBody && !req.is("application/json")) {
    res.status(415).json({ error: "Il corpo deve essere JSON" });
    return;
  }
  next();
}
