import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./schemas.js";

describe("schemi di autenticazione", () => {
  it("l'email viene ripulita dagli spazi e portata in minuscolo", () => {
    const result = registerSchema.parse({ email: "  Mario.Rossi@Example.IT ", password: "12345678" });
    expect(result.email).toBe("mario.rossi@example.it");
  });

  it("rifiuta un'email non valida", () => {
    expect(registerSchema.safeParse({ email: "non-una-email", password: "12345678" }).success).toBe(false);
  });

  it("la password di registrazione va da 8 a 128 caratteri", () => {
    const base = { email: "a@b.it" };
    expect(registerSchema.safeParse({ ...base, password: "1234567" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: "12345678" }).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, password: "x".repeat(128) }).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, password: "x".repeat(129) }).success).toBe(false);
  });

  it("il login accetta qualsiasi password non vuota fino a 128 caratteri", () => {
    expect(loginSchema.safeParse({ email: "a@b.it", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "a@b.it", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.it", password: "x".repeat(129) }).success).toBe(false);
  });

  it("i campi in più (es. un id utente) vengono scartati", () => {
    const result = registerSchema.parse({ email: "a@b.it", password: "12345678", id: "x", isDemo: true });
    expect(result).toEqual({ email: "a@b.it", password: "12345678" });
  });
});
