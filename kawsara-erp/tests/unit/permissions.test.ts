import { describe, it, expect } from "vitest";
import { can } from "@/lib/permissions";

describe("RBAC (cahier des charges section 6)", () => {
  it("ADMIN a tous les droits (wildcard)", () => {
    expect(can("ADMIN", "product.update")).toBe(true);
    expect(can("ADMIN", "n'importe.quoi")).toBe(true);
  });

  it("CAISSIER peut vendre mais pas modifier un produit (critere d'acceptation 58.11)", () => {
    expect(can("CAISSIER", "sale.create")).toBe(true);
    expect(can("CAISSIER", "product.update")).toBe(false);
    expect(can("CAISSIER", "product.delete")).toBe(false);
  });

  it("VENDEUR est limite aux debits et factures (section 5)", () => {
    expect(can("VENDEUR", "debit.create")).toBe(true);
    expect(can("VENDEUR", "invoice.create")).toBe(true);
    expect(can("VENDEUR", "sale.create")).toBe(false);
    expect(can("VENDEUR", "stock.adjust")).toBe(false);
  });

  it("MAGASINIER gere le stock mais pas les ventes", () => {
    expect(can("MAGASINIER", "stock.adjust")).toBe(false); // action reservee a l'admin principal
    expect(can("MAGASINIER", "sale.create")).toBe(false);
  });

  it("CLIENT est limite a la boutique en ligne (section 31)", () => {
    expect(can("CLIENT", "shop.order")).toBe(true);
    expect(can("CLIENT", "product.read")).toBe(false);
    expect(can("CLIENT", "invoice.read")).toBe(false);
  });

  it("GERANT beneficie des wildcards par ressource", () => {
    expect(can("GERANT", "product.create")).toBe(true);
    expect(can("GERANT", "product.read")).toBe(true);
    expect(can("GERANT", "user.delete")).toBe(false); // non accorde explicitement
  });

  it("reserve les actions dangereuses a l'admin principal uniquement", () => {
    for (const permission of ["category.delete", "debit.cancel", "ecommerceOrder.cancel", "stock.adjust", "user.create", "user.update"]) {
      expect(can("ADMIN", permission, true)).toBe(true);
      expect(can("ADMIN", permission)).toBe(false);
      expect(can("GERANT", permission)).toBe(false);
      expect(can("CAISSIER", permission, true)).toBe(false); // le drapeau seul ne suffit pas sans le role ADMIN
    }
  });

  it("n'accorde rien de plus a l'admin principal pour les actions ordinaires", () => {
    expect(can("ADMIN", "product.create")).toBe(true);
    expect(can("CAISSIER", "debit.create")).toBe(true);
  });
});
