import { describe, expect, it } from "vitest";
import {
  SESSION_DURATION_MS,
  SESSION_RENEW_THRESHOLD_MS,
  generateSessionToken,
  hashSessionToken,
  newSessionExpiry,
  sessionStatus,
} from "./session.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date("2027-01-11T10:00:00Z");

describe("token di sessione", () => {
  it("è di 24 byte in base64url, quindi 32 caratteri senza simboli speciali", () => {
    const token = generateSessionToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });

  it("due token generati sono diversi", () => {
    const tokens = new Set(Array.from({ length: 1000 }, generateSessionToken));
    expect(tokens.size).toBe(1000);
  });

  it("l'hash è SHA-256 in esadecimale, deterministico e diverso dal token", () => {
    const token = generateSessionToken();
    const hash = hashSessionToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSessionToken(token)).toBe(hash);
    expect(hash).not.toContain(token);
    expect(hashSessionToken(generateSessionToken())).not.toBe(hash);
  });

  it("calcola un hash noto (SHA-256 di 'abc')", () => {
    expect(hashSessionToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("scadenza della sessione", () => {
  it("una sessione nuova dura 30 giorni", () => {
    expect(SESSION_DURATION_MS).toBe(30 * DAY_MS);
    expect(newSessionExpiry(now).getTime() - now.getTime()).toBe(30 * DAY_MS);
  });

  it("è valida finché mancano almeno 15 giorni", () => {
    expect(sessionStatus(newSessionExpiry(now), now)).toBe("valid");
    const quindiciGiorni = new Date(now.getTime() + SESSION_RENEW_THRESHOLD_MS);
    expect(sessionStatus(quindiciGiorni, now)).toBe("valid");
  });

  it("va rinnovata quando mancano meno di 15 giorni", () => {
    const quasiQuindici = new Date(now.getTime() + SESSION_RENEW_THRESHOLD_MS - 1);
    expect(sessionStatus(quasiQuindici, now)).toBe("renew");
    expect(sessionStatus(new Date(now.getTime() + 1000), now)).toBe("renew");
  });

  it("è scaduta alla scadenza esatta e dopo", () => {
    expect(sessionStatus(now, now)).toBe("expired");
    expect(sessionStatus(new Date(now.getTime() - 1), now)).toBe("expired");
    expect(sessionStatus(new Date(now.getTime() - 40 * DAY_MS), now)).toBe("expired");
  });
});
