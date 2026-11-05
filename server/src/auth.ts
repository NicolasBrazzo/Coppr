import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/index.js";
import * as schema from "./db/schema.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email.js";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} mancante: copia .env.example in .env e compilalo`);
  return value;
}

const isProd = process.env.NODE_ENV === "production";
const DAY = 60 * 60 * 24;

export const frontendUrl = requireEnv("FRONTEND_URL");

// Le funzioni di invio non vengono attese: la risposta non deve dipendere dai tempi
// dell'email (timing attack), come raccomanda la documentazione di Better Auth
function fireAndForget(send: Promise<void>) {
  send.catch(() => console.error("[email] invio non riuscito"));
}

export const auth = betterAuth({
  baseURL: requireEnv("BETTER_AUTH_URL"),
  secret: requireEnv("BETTER_AUTH_SECRET"),
  trustedOrigins: [frontendUrl],
  database: drizzleAdapter(db, { provider: "pg", schema, usePlural: true }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Verifica facoltativa: si entra subito, il link arriva comunque
    requireEmailVerification: false,
    autoSignIn: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      fireAndForget(sendPasswordResetEmail({ to: user.email, url }));
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      fireAndForget(sendVerificationEmail({ to: user.email, url }));
    },
  },

  session: {
    expiresIn: 30 * DAY,
    // Ogni giorno di utilizzo la scadenza riparte da 30 giorni
    updateAge: DAY,
  },

  user: {
    additionalFields: {
      // Impostato solo dal server, mai dal client
      isDemo: { type: "boolean", required: false, defaultValue: false, input: false },
    },
  },

  // Attivo anche in sviluppo (di default lo sarebbe solo in produzione).
  // In memoria: basta finché il server gira su una sola istanza
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
      "/request-password-reset": { window: 60, max: 3 },
      "/send-verification-email": { window: 60, max: 3 },
    },
  },

  advanced: {
    useSecureCookies: isProd,
    defaultCookieAttributes: { httpOnly: true, secure: isProd, sameSite: "lax" },
    // Gli id li genera Postgres (default uuidv7() nello schema)
    database: { generateId: "uuid" },
  },
});

export type AuthSession = typeof auth.$Infer.Session;
export type AuthUser = AuthSession["user"];
