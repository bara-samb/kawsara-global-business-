import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/csv";

describe("Export CSV (cahier des charges section 33/56)", () => {
  it("genere un en-tete et des lignes separes par point-virgule", () => {
    const csv = toCsv([{ a: "x", b: 1 }], [{ key: "a", label: "A" }, { key: "b", label: "B" }]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toContain("A;B");
    expect(lines[1]).toBe("x;1");
  });

  it("echappe les valeurs contenant un point-virgule ou des guillemets", () => {
    const csv = toCsv([{ a: 'valeur; avec "guillemets"' }], [{ key: "a", label: "A" }]);
    expect(csv).toContain('"valeur; avec ""guillemets"""');
  });

  it("retourne uniquement l'en-tete si aucune ligne (donnees exportables meme vides)", () => {
    const csv = toCsv([], [{ key: "a", label: "A" }]);
    expect(csv.split("\r\n")).toHaveLength(1);
  });
});
