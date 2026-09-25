import { describe, it, expect } from "vitest";
import { canAccessErpPath } from "@/lib/erp-access";

describe("Acces aux pages ERP par role (cahier des charges section 6)", () => {
  it("bloque les pages sensibles pour un role sans la permission", () => {
    expect(canAccessErpPath("VENDEUR", "/erp/rapports")).toBe(false);
    expect(canAccessErpPath("VENDEUR", "/erp/utilisateurs")).toBe(false);
    expect(canAccessErpPath("MAGASINIER", "/erp/securite")).toBe(false);
    expect(canAccessErpPath("CAISSIER", "/erp/produits/nouveau")).toBe(false);
  });

  it("autorise les pages couvertes par les permissions du role", () => {
    expect(canAccessErpPath("VENDEUR", "/erp/debits/nouveau")).toBe(true);
    expect(canAccessErpPath("MAGASINIER", "/erp/stock")).toBe(true);
    expect(canAccessErpPath("CAISSIER", "/erp/produits/abc123")).toBe(true);
    expect(canAccessErpPath("ADMIN", "/erp/securite")).toBe(true);
  });

  it("laisse chaque employe acceder au tableau de bord et a sa 2FA, jamais un client", () => {
    expect(canAccessErpPath("MAGASINIER", "/erp")).toBe(true);
    expect(canAccessErpPath("VENDEUR", "/erp/securite/2fa")).toBe(true);
    expect(canAccessErpPath("CLIENT", "/erp")).toBe(false);
  });
});
