import { describe, it, expect } from "vitest";
import { z } from "zod";
import { humanizeError, UserError, GENERIC_ERROR_MESSAGE } from "@/lib/errors";
import { ForbiddenError } from "@/lib/permissions";

describe("humanizeError : jamais de message technique affiche a l'utilisateur", () => {
  it("affiche tel quel le message d'une erreur metier", () => {
    expect(humanizeError(new UserError("Stock insuffisant pour Marteau."))).toBe("Stock insuffisant pour Marteau.");
  });

  it("explique un refus de permission en francais, sans le code technique", () => {
    const message = humanizeError(new ForbiddenError("stock.adjust"));
    expect(message).toBe("Acces refuse : seul l'administrateur principal peut ajuster le stock.");
    expect(message).not.toContain("stock.adjust");
    expect(humanizeError(new ForbiddenError("sale.create"))).toBe(
      "Acces refuse : votre compte n'a pas le droit d'enregistrer une vente."
    );
  });

  it("traduit les erreurs de validation avec le nom lisible du champ", () => {
    const schema = z.object({ newQuantity: z.coerce.number().int().min(0), reason: z.string().min(2, "Le motif est obligatoire") });
    const result = schema.safeParse({ newQuantity: "-3", reason: "" });
    const message = humanizeError(result.error);
    expect(message).toContain("Nouvelle quantite :");
    expect(message).toContain("Motif : Le motif est obligatoire");
    expect(message).not.toMatch(/too small|expected/i);
  });

  it("traduit les erreurs connues de la base de donnees", () => {
    const err = Object.assign(new Error("Unique constraint failed on the fields: (`email`)"), {
      name: "PrismaClientKnownRequestError",
      code: "P2002",
    });
    expect(humanizeError(err)).toMatch(/existe deja/);
  });

  it("masque les erreurs inattendues derriere un message generique", () => {
    expect(humanizeError(new TypeError("Cannot read properties of undefined (reading 'id')"))).toBe(GENERIC_ERROR_MESSAGE);
    expect(humanizeError(new Error("SQLITE_BUSY: database is locked"))).toBe(GENERIC_ERROR_MESSAGE);
  });
});
