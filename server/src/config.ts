// Variabili d'ambiente lette in un posto solo. Si fermano subito se mancano.
export function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} mancante: copia .env.example in .env e compilalo`);
  return value;
}

export const isProd = process.env.NODE_ENV === "production";

export const frontendUrl = requireEnv("FRONTEND_URL");
