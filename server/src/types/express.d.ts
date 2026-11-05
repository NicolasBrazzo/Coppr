import type { AuthSession, AuthUser } from "../auth/session-store.js";

declare global {
  namespace Express {
    interface Request {
      // Valorizzati da requireAuth
      user?: AuthUser;
      session?: AuthSession;
    }
  }
}

export {};
