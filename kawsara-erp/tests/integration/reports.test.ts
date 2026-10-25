import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { getFullAggregates, parseReportRange } from "@/lib/reports";
import { startOfMonth, startOfWeek } from "@/lib/dates";

describe("Rapports : CA par jour et par mois, marge avec remise", () => {
  let storeId: string;

  async function invoice(createdAt: string, lines: { productId: string; quantity: number; unitPrice: number }[], discount = 0, status: "PAYEE" | "ANNULEE" = "PAYEE") {
    const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    const total = subtotal - discount;
    const seller = await prisma.user.findFirstOrThrow({ where: { email: { startsWith: "rapport-vitest-" } } });
    await prisma.invoice.create({
      data: {
        reference: await generateReference("invoice"),
        storeId,
        origin: "VENTE",
        sellerId: seller.id,
        subtotal,
        discount,
        total,
        paidAmount: total,
        remainingAmount: 0,
        status,
        createdAt: new Date(createdAt),
        items: { create: lines.map((l) => ({ ...l, total: l.quantity * l.unitPrice })) },
      },
    });
  }

  beforeAll(async () => {
    const store = await prisma.store.create({
      data: { reference: await generateReference("store"), name: "Boutique test rapports" },
    });
    storeId = store.id;
    await prisma.user.create({
      data: {
        reference: await generateReference("user"),
        name: "Vendeur rapports",
        email: `rapport-vitest-${Date.now()}@example.com`,
        passwordHash: "unused-in-tests",
        role: "VENDEUR",
        storeId,
      },
    });
    const a = await prisma.product.create({
      data: { reference: await generateReference("product"), name: "Produit A rapports", purchasePrice: 600, sellingPrice: 1000 },
    });
    const b = await prisma.product.create({
      data: { reference: await generateReference("product"), name: "Produit B rapports", purchasePrice: 2000, sellingPrice: 3000 },
    });

    // 30 septembre 23h30 et 1er octobre 00h15 (heure de Dakar = UTC) : deux jours et deux mois differents.
    await invoice("2026-09-30T23:30:00Z", [{ productId: a.id, quantity: 2, unitPrice: 1000 }]);
    // 4 000 de lignes, remise de 1 000 => CA 3 000.
    await invoice("2026-10-01T00:15:00Z", [
      { productId: a.id, quantity: 1, unitPrice: 1000 },
      { productId: b.id, quantity: 1, unitPrice: 3000 },
    ], 1000);
    await invoice("2026-10-01T10:00:00Z", [{ productId: b.id, quantity: 1, unitPrice: 3000 }]);
    // Facture annulee : jamais comptee.
    await invoice("2026-10-01T11:00:00Z", [{ productId: b.id, quantity: 5, unitPrice: 3000 }], 0, "ANNULEE");
  });

  it("additionne le CA par jour et par mois, sans les factures annulees", async () => {
    const range = parseReportRange({ from: "2026-09-30", to: "2026-10-01", storeId }, null);
    const r = await getFullAggregates(range);

    expect(r.revenue).toBe(2000 + 3000 + 3000);
    expect(r.invoiceCount).toBe(3);
    expect(r.revenueByDay).toEqual([
      { date: "2026-09-30", revenue: 2000 },
      { date: "2026-10-01", revenue: 6000 },
    ]);
    expect(r.revenueByMonth).toEqual([
      { month: "2026-09", revenue: 2000, invoices: 1 },
      { month: "2026-10", revenue: 6000, invoices: 2 },
    ]);
  });

  it("deduit la remise de la vente de la marge et du CA par produit", async () => {
    const range = parseReportRange({ from: "2026-09-30", to: "2026-10-01", storeId }, null);
    const r = await getFullAggregates(range);

    // Couts : A x3 = 1 800, B x2 = 4 000 => marge = 8 000 - 5 800.
    expect(r.profit).toBeCloseTo(2200);
    // La somme du CA par produit retombe exactement sur le CA total.
    expect(r.products.reduce((s, p) => s + p.revenue, 0)).toBeCloseTo(r.revenue);
  });

  it("une journee choisie couvre de 00:00 a 23:59:59 (heure de Dakar)", () => {
    const range = parseReportRange({ from: "2026-10-01", to: "2026-10-01" }, null);
    expect(range.from.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-10-01T23:59:59.999Z");
  });

  it("debut de semaine (lundi) et de mois", () => {
    const sunday = new Date("2026-10-25T15:00:00Z");
    expect(startOfWeek(sunday).toISOString()).toBe("2026-10-19T00:00:00.000Z");
    expect(startOfMonth(sunday).toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });
});
