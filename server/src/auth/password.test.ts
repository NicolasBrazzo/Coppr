import { describe, expect, it } from "vitest";
import { hashPassword, normalizePassword, verifyAgainstDummy, verifyPassword } from "./password.js";

describe("password", () => {
  it("salva l'hash nel formato scrypt$N$r$p$sale$hash con i parametri dentro la stringa", async () => {
    const hash = await hashPassword("una password lunga");
    const [name, n, r, p, salt, key] = hash.split("$");
    expect(name).toBe("scrypt");
    expect(Number(n)).toBe(65536);
    expect(Number(r)).toBe(8);
    expect(Number(p)).toBe(2);
    expect(Buffer.from(salt, "base64")).toHaveLength(16);
    expect(Buffer.from(key, "base64")).toHaveLength(64);
    expect(hash).not.toContain("una password lunga");
  });

  it("accetta la password giusta e rifiuta quella sbagliata", async () => {
    const hash = await hashPassword("password-corretta");
    expect(await verifyPassword("password-corretta", hash)).toBe(true);
    expect(await verifyPassword("password-sbagliata", hash)).toBe(false);
  });

  it("la stessa password dà hash diversi (sale casuale)", async () => {
    const [a, b] = await Promise.all([hashPassword("stessa-password"), hashPassword("stessa-password")]);
    expect(a).not.toBe(b);
  });

  it("normalizza in NFKC: forma composta e scomposta sono la stessa password", async () => {
    const composta = "caffè-1234";
    const scomposta = "caffè-1234";
    expect(composta).not.toBe(scomposta);
    expect(normalizePassword(composta)).toBe(normalizePassword(scomposta));
    const hash = await hashPassword(composta);
    expect(await verifyPassword(scomposta, hash)).toBe(true);
  });

  it("un hash malformato dà false senza lanciare eccezioni", async () => {
    for (const stored of [
      "",
      "non-un-hash",
      "scrypt$1$2$3",
      "bcrypt$65536$8$2$c2FsZQ==$aGFzaA==",
      "scrypt$abc$8$2$c2FsZQ==$aGFzaA==",
      "scrypt$65536$8$2$$aGFzaA==",
      "scrypt$65536$8$2$c2FsZQ==$",
    ]) {
      expect(await verifyPassword("qualunque", stored)).toBe(false);
    }
  });

  it("rifiuta parametri fuori misura senza allocare memoria", async () => {
    const hash = await hashPassword("password-corretta");
    const [, , r, p, salt, key] = hash.split("$");
    const enorme = ["scrypt", 2 ** 30, r, p, salt, key].join("$");
    expect(await verifyPassword("password-corretta", enorme)).toBe(false);
  });

  it("verifyAgainstDummy termina senza errori", async () => {
    await expect(verifyAgainstDummy("qualunque")).resolves.toBeUndefined();
  });
});
