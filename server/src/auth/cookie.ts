import type { CookieOptions, Request, Response } from "express";
import { isProd } from "../config.js";

// __Host- richiede Secure, Path=/ e nessun Domain: si usa solo in produzione (HTTPS)
export const SESSION_COOKIE = isProd ? "__Host-coppr_session" : "coppr_session";

const attributes: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax",
  path: "/",
};

// Il cookie scade insieme alla riga del database, anche dopo un rinnovo
export function setSessionCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(SESSION_COOKIE, token, { ...attributes, expires: expiresAt });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, attributes);
}

export function readSessionToken(req: Request): string | undefined {
  const value: unknown = req.cookies?.[SESSION_COOKIE];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
