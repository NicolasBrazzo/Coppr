import type { AuthSession } from "../auth.js";

declare global {
  namespace Express {
    interface Request {
      // Valorizzati da requireAuth
      user?: AuthSession["user"];
      session?: AuthSession["session"];
    }
  }
}

export {};
