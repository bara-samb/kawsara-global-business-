import { describe, it, expect } from "vitest";
import { describeAudit, actionsOfCategory } from "@/lib/audit-display";

const log = (action: string, entity: string, entityId: string | null = null, metadata: string | null = null) => ({
  action,
  entity,
  entityId,
  metadata,
});

describe("Journal d'audit : phrases lisibles", () => {
  it("decrit une annulation avec la reference et un lien vers l'element", () => {
    const names = new Map([["Debit:d1", "DEB-2026-000012"]]);
    const d = describeAudit(log("CANCEL", "Debit", "d1", JSON.stringify({ reference: "DEB-2026-000012" })), names);
    expect(d.verb).toBe("a annule");
    expect(d.category).toBe("suppression");
    expect(d.object).toEqual({ label: "le debit", name: "DEB-2026-000012", href: "/erp/debits/d1" });
    expect(d.details).toEqual([]); // la reference est deja dans la phrase
  });

  it("garde le nom d'un element supprime grace aux metadonnees, sans lien mort", () => {
    const d = describeAudit(log("DELETE", "Category", "c1", JSON.stringify({ name: "Carrelage" })), new Map());
    expect(d.object).toEqual({ label: "la categorie", name: "Carrelage", href: undefined });
  });

  it("detaille une correction de stock (avant -> apres, depot, motif)", () => {
    const names = new Map([["Product:p1", "Ciment CEM II 50kg"], ["Store:s1", "Depot Principal"]]);
    const meta = JSON.stringify({ productId: "p1", storeId: "s1", previousQuantity: 10, newQuantity: 7, reason: "Casse" });
    const d = describeAudit(log("STOCK_ADJUST", "Stock", null, meta), names);
    expect(d.object?.name).toBe("Ciment CEM II 50kg");
    expect(d.details).toEqual([
      { label: "Depot", value: "Depot Principal" },
      { label: "Quantite", value: "10 → 7" },
      { label: "Motif", value: "Casse" },
    ]);
  });

  it("explique un acces refuse sans code technique", () => {
    const d = describeAudit(log("ACCESS_DENIED", "stock.adjust"), new Map());
    expect(d.category).toBe("securite");
    expect(d.details[0].value).toBe("seul l'administrateur principal peut ajuster le stock.");
  });

  it("traduit les statuts et motifs d'une annulation de commande", () => {
    const meta = JSON.stringify({ reference: "CMD-1", previousStatus: "EN_ATTENTE", reason: "Client injoignable" });
    const d = describeAudit(log("CANCEL", "EcommerceOrder", "o1", meta), new Map());
    expect(d.details).toEqual([
      { label: "Ancien statut", value: "En attente" },
      { label: "Motif", value: "Client injoignable" },
    ]);
  });

  it("classe les connexions a part pour le filtre", () => {
    expect(actionsOfCategory("connexion")).toEqual(expect.arrayContaining(["LOGIN", "LOGOUT"]));
  });
});
