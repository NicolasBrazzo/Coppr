import { Router, type Request } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { clearSessionCookie, readSessionToken, setSessionCookie } from "./cookie.js";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "./password.js";
import { createRateLimiter, rateLimit } from "./rate-limit.js";
import { currentSession, currentUser, requireAuth } from "./require-auth.js";
import { firstIssue, loginSchema, registerSchema } from "./schemas.js";
import { createSession, deleteSession, deleteSessionByToken, type AuthUser } from "./session-store.js";

export const authRouter = Router();

const MINUTE = 60_000;
const loginPerEmail = createRateLimiter({ limit: 5, windowMs: MINUTE });
const loginPerIp = createRateLimiter({ limit: 20, windowMs: MINUTE });
const registerPerIp = createRateLimiter({ limit: 3, windowMs: MINUTE });

const ip = (req: Request) => req.ip ?? "unknown";
// Il corpo non è ancora validato: si normalizza solo quel che serve per la chiave
const ipAndEmail = (req: Request) => {
  const email: unknown = req.body?.email;
  return `${ip(req)}|${typeof email === "string" ? email.trim().toLowerCase() : ""}`;
};

const publicUser = ({ id, email, name }: Pick<AuthUser, "id" | "email" | "name">) => ({ id, email, name });

const INVALID_CREDENTIALS = "Email o password non corretti";

authRouter.post("/api/auth/register", rateLimit(registerPerIp, ip), async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: firstIssue(parsed.error) });
    return;
  }
  const { email, password } = parsed.data;

  // onConflictDoNothing: l'email duplicata non diventa un'eccezione, nemmeno in caso di corsa
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash: await hashPassword(password) })
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id, email: users.email, name: users.name });
  if (!user) {
    res.status(409).json({ error: "Esiste già un account con questa email" });
    return;
  }

  const session = await createSession(user.id);
  setSessionCookie(res, session.token, session.expiresAt);
  res.status(201).json(publicUser(user));
});

authRouter.post(
  "/api/auth/login",
  rateLimit(loginPerIp, ip),
  rateLimit(loginPerEmail, ipAndEmail),
  async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: firstIssue(parsed.error) });
      return;
    }
    const { email, password } = parsed.data;

    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email));

    // Utente inesistente o senza password (demo): verifica comunque, così i tempi non lo rivelano
    if (!user?.passwordHash) {
      await verifyAgainstDummy(password);
      res.status(401).json({ error: INVALID_CREDENTIALS });
      return;
    }
    if (!(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ error: INVALID_CREDENTIALS });
      return;
    }

    // Contro la session fixation: la sessione che stava già nel cookie non sopravvive al login
    const previous = readSessionToken(req);
    if (previous) await deleteSessionByToken(previous);

    const session = await createSession(user.id);
    setSessionCookie(res, session.token, session.expiresAt);
    res.json(publicUser(user));
  },
);

authRouter.post("/api/auth/logout", requireAuth, async (req, res) => {
  await deleteSession(currentSession(req).id);
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.get("/api/me", requireAuth, (req, res) => {
  res.json(publicUser(currentUser(req)));
});
