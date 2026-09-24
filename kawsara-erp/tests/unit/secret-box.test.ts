import { describe, it, expect } from "vitest";
import { encryptSecret, decryptSecret } from "@/lib/secret-box";

describe("Chiffrement du secret 2FA en base", () => {
  it("chiffre (valeur illisible en base) puis dechiffre a l'identique", () => {
    const encrypted = encryptSecret("JBSWY3DPEHPK3PXP");
    expect(encrypted).not.toContain("JBSWY3DPEHPK3PXP");
    expect(encrypted.startsWith("v1:")).toBe(true);
    expect(decryptSecret(encrypted)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("detecte toute alteration du secret chiffre", () => {
    const encrypted = encryptSecret("JBSWY3DPEHPK3PXP");
    const tampered = encrypted.slice(0, -4) + (encrypted.endsWith("AAAA") ? "BBBB" : "AAAA");
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("lit encore les anciens secrets stockes en clair", () => {
    expect(decryptSecret("JBSWY3DPEHPK3PXP")).toBe("JBSWY3DPEHPK3PXP");
  });
});
