import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// Parametri OWASP per scrypt: N = 2^16, r = 8, p = 2 (circa 64 MB per hash).
// Stanno anche dentro la stringa salvata, così si potranno alzare senza rompere i vecchi hash.
const N = 2 ** 16;
const R = 8;
const P = 2;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
// Memoria necessaria: 128 * N * r (64 MB). Il limite di Node di default (32 MB) non basta
const MAX_MEM = 128 * 1024 * 1024;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

function derive(password: string, salt: Buffer, options: ScryptOptions, keyLength: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(normalizePassword(password), salt, keyLength, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

// NFKC: lo stesso testo digitato con tastiere diverse dà la stessa password
export function normalizePassword(password: string) {
  return password.normalize("NFKC");
}

// Formato: scrypt$N$r$p$sale$hash (sale e hash in base64)
export async function hashPassword(password: string) {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, { N, r: R, p: P, maxmem: MAX_MEM }, KEY_LENGTH);
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

type ParsedHash = { N: number; r: number; p: number; salt: Buffer; key: Buffer };

function parseHash(stored: string): ParsedHash | null {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;
  const [, n, r, p, salt, key] = parts;
  const params = [Number(n), Number(r), Number(p)];
  if (!params.every((value) => Number.isInteger(value) && value > 0)) return null;
  const saltBuffer = Buffer.from(salt, "base64");
  const keyBuffer = Buffer.from(key, "base64");
  if (saltBuffer.length === 0 || keyBuffer.length === 0) return null;
  return { N: params[0], r: params[1], p: params[2], salt: saltBuffer, key: keyBuffer };
}

// Un hash malformato o con parametri fuori misura dà sempre false, mai un'eccezione
export async function verifyPassword(password: string, stored: string) {
  const parsed = parseHash(stored);
  if (!parsed) return false;
  // Evita che un valore corrotto nel database faccia allocare memoria senza limite
  if (parsed.N > N * 4 || parsed.r > 32 || parsed.p > 16) return false;
  try {
    const key = await derive(
      password,
      parsed.salt,
      { N: parsed.N, r: parsed.r, p: parsed.p, maxmem: 128 * parsed.N * parsed.r * 2 },
      parsed.key.length,
    );
    return timingSafeEqual(key, parsed.key);
  } catch {
    return false;
  }
}

// Hash fittizio, calcolato una volta sola: il login con un'email inesistente verifica
// comunque una password contro questo, così il tempo di risposta non rivela se l'utente esiste.
let dummyHash: Promise<string> | undefined;
export async function verifyAgainstDummy(password: string) {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  await verifyPassword(password, await dummyHash);
}
