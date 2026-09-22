import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

let testSession: { user: Record<string, unknown> } | null = null;
vi.mock("@/lib/auth", () => ({ auth: async () => testSession }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    const err = new Error(`NEXT_REDIRECT:${url}`);
    (err as { digest?: string }).digest = `NEXT_REDIRECT;replace;${url};307;`;
    throw err;
  },
}));

const { createSale } = await import("@/lib/actions/sales");

describe("Ventes comptant : blocage si stock insuffisant (critere d'acceptation 58.5)", () => {
  let storeId: string;
  let productId: string;

  beforeAll(async () => {
    const store = await prisma.store.create({
      data: { reference: await generateReference("store"), name: "Boutique test vente" },
    });
    storeId = store.id;

    const user = await prisma.user.create({
      data: {
        reference: await generateReference("user"),
        name: "Caissier Vente Vitest",
        email: `caissier-vente-vitest-${Date.now()}@example.com`,
        passwordHash: "unused-in-tests",
        role: "CAISSIER",
        storeId,
      },
    });
    testSession = {
      user: { id: user.id, name: user.name, email: user.email, role: "CAISSIER", reference: user.reference, storeId, customerId: null },
    };

    const product = await prisma.product.create({
      data: {
        reference: await generateReference("product"),
        name: "Produit test vente",
        purchasePrice: 1000,
        sellingPrice: 2000,
        active: true,
        stocks: { create: { storeId, quantity: 2 } },
      },
    });
    productId = product.id;
  });

  it("bloque la vente et n'ecrit rien en base quand la quantite demandee depasse le stock", async () => {
    const fd = new FormData();
    fd.set("storeId", storeId);
    fd.set("discount", "0");
    fd.set("paymentOption", "METHOD:WAVE");
    fd.set("items", JSON.stringify([{ productId, quantity: 5, unitPrice: 2000 }]));

    await expect(createSale(fd)).rejects.toThrow(/stock insuffisant/i);

    const stock = await prisma.stock.findUnique({ where: { productId_storeId: { productId, storeId } } });
    expect(stock?.quantity).toBe(2); // inchange

    const saleCount = await prisma.sale.count({ where: { items: { some: { productId } } } });
    expect(saleCount).toBe(0);
  });

  afterAll(async () => {
    await prisma.stockMovement.deleteMany({ where: { productId } });
    await prisma.stock.deleteMany({ where: { productId } });
    await prisma.product.delete({ where: { id: productId } });
    await prisma.user.delete({ where: { id: testSession!.user.id as string } });
    await prisma.store.delete({ where: { id: storeId } });
    await prisma.$disconnect();
  });
});
