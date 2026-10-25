import { describe, expect, it } from "vitest";
import { matchesQuery, normalizeSearch, rankByQuery } from "@/lib/search";

describe("Recherche produit tolerante", () => {
  it("ignore la casse et les accents", () => {
    expect(normalizeSearch("  Électricité  Générale ")).toBe("electricite generale");
    expect(matchesQuery("Câble électrique 2,5mm", "cable ELEC")).toBe(true);
  });

  it("exige que chaque mot saisi soit present, dans n'importe quel champ", () => {
    expect(matchesQuery(["Ciment CEM II 50kg", "PRD-2026-000001", "Materiaux"], "cim 50")).toBe(true);
    expect(matchesQuery(["Ciment CEM II 50kg", "PRD-2026-000001"], "000001")).toBe(true);
    expect(matchesQuery(["Ciment CEM II 50kg"], "cim 25")).toBe(false);
  });

  it("une saisie vide correspond a tout", () => {
    expect(matchesQuery("Marteau", "   ")).toBe(true);
  });

  it("classe d'abord les libelles qui commencent par la saisie, des la premiere lettre", () => {
    const items = ["Interrupteur simple", "Peinture vinylique", "Pinceau plat", "Prise 2P+T", "Cadenas laiton"];
    expect(rankByQuery(items, "p", (s) => s)).toEqual([
      "Peinture vinylique",
      "Pinceau plat",
      "Prise 2P+T",
      "Interrupteur simple",
    ]);
  });
});
