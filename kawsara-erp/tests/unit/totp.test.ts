import { describe, it, expect } from "vitest";
import { generateSecret, generateTotp, verifyTotp } from "@/lib/totp";

describe("TOTP / 2FA (cahier des charges section 37/48)", () => {
  it("genere un secret different a chaque appel", () => {
    const a = generateSecret();
    const b = generateSecret();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(10);
  });

  it("verifie un code valide genere pour l'instant present", () => {
    const secret = generateSecret();
    const code = generateTotp(secret);
    expect(verifyTotp(secret, code)).toBe(true);
  });

  it("refuse un code incorrect", () => {
    const secret = generateSecret();
    expect(verifyTotp(secret, "000000")).toBe(false);
  });

  it("refuse un format de code invalide", () => {
    const secret = generateSecret();
    expect(verifyTotp(secret, "abcdef")).toBe(false);
    expect(verifyTotp(secret, "123")).toBe(false);
  });

  it("tolere le pas de temps precedent (derive horloge)", () => {
    const secret = generateSecret();
    const thirtySecondsAgo = Date.now() - 30_000;
    const code = generateTotp(secret, thirtySecondsAgo);
    expect(verifyTotp(secret, code, Date.now())).toBe(true);
  });

  it("refuse un code trop ancien (hors fenetre de tolerance)", () => {
    const secret = generateSecret();
    const longAgo = Date.now() - 5 * 60_000;
    const code = generateTotp(secret, longAgo);
    expect(verifyTotp(secret, code, Date.now())).toBe(false);
  });
});
