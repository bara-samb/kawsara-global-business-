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

  it("neutralise les formules Excel saisies par un utilisateur (injection CSV)", () => {
    const csv = toCsv(
      [{ a: '=HYPERLINK("http://pirate.example","Cliquez")', b: "+33 6", c: -500 }],
      [{ key: "a", label: "A" }, { key: "b", label: "B" }, { key: "c", label: "C" }]
    );
    const line = csv.split("\r\n")[1];
    expect(line.startsWith("\"'=HYPERLINK")).toBe(true);
    expect(line).toContain(";'+33 6;");
    expect(line.endsWith(";-500")).toBe(true); // un vrai nombre negatif reste un nombre
  });
});
