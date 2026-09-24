import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

let testSession: { user: Record<string, unknown> } | null = null;
vi.mock("@/lib/auth", () => ({ auth: async () => testSession }));

const { createEcommerceOrder } = await import("@/lib/actions/ecommerce");

describe("Commande e-commerce : securite du stock (cahier des charges section 39/51)", () => {
  let storeId: string;
  let productId: string;

  beforeAll(async () => {
    const store = await prisma.store.create({
      data: { reference: await generateReference("store"), name: "Boutique test vitest" },
    });
    storeId = store.id;

    const userRef = await generateReference("user");
    const customerRef = await generateReference("customer");
    const user = await prisma.user.create({
      data: {
        reference: userRef,
        name: "Client Vitest",
        email: `client-vitest-${Date.now()}@example.com`,
        passwordHash: "unused-in-tests",
        role: "CLIENT",
      },
    });
    const customer = await prisma.customer.create({
      data: { reference: customerRef, name: user.name, email: user.email, userId: user.id },
    });

    testSession = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: "CLIENT",
        reference: user.reference,
        storeId: null,
        customerId: customer.id,
      },
    };

    const product = await prisma.product.create({
      data: {
        reference: await generateReference("product"),
        name: "Produit test vitest",
        purchasePrice: 1000,
        sellingPrice: 2000,
        active: true,
        onlineEnabled: true,
        stocks: { create: { storeId, quantity: 1 } },
      },
    });
    productId = product.id;
  });

  it("bloque une commande dont la quantite depasse le stock total disponible (section 19)", async () => {
    const result = await createEcommerceOrder({
      items: [{ productId, quantity: 5 }],
      customerName: "Client Vitest",
      shippingAddress: "Adresse",
      shippingPhone: "770000000",
      paymentMethod: "ESPECES",
    });
    expect("error" in result && result.error).toMatch(/stock insuffisant/i);
  });

  it("n'autorise qu'une seule des deux commandes simultanees sur le dernier article en stock (pas de double vente)", async () => {
    const checkoutInput = {
      items: [{ productId, quantity: 1 }],
      customerName: "Client Vitest",
      shippingAddress: "Adresse",
      shippingPhone: "770000000",
      paymentMethod: "ESPECES" as const,
    };

    const results = await Promise.all([
      createEcommerceOrder(checkoutInput),
      createEcommerceOrder(checkoutInput),
    ]);

    expect(results.filter((r) => !("error" in r))).toHaveLength(1);
    expect(results.filter((r) => "error" in r)).toHaveLength(1);

    const stock = await prisma.stock.findUnique({ where: { productId_storeId: { productId, storeId } } });
    expect(stock?.reserved).toBe(1);

    const orderCount = await prisma.ecommerceOrder.count({ where: { items: { some: { productId } } } });
    expect(orderCount).toBe(1);
  });

  it("refuse les quantites abusives (anti-blocage du stock)", async () => {
    const result = await createEcommerceOrder({
      items: [{ productId, quantity: 101 }],
      customerName: "Client Vitest",
      shippingAddress: "Adresse",
      shippingPhone: "770000001",
      paymentMethod: "ESPECES",
    });
    expect("error" in result && result.error).toMatch(/100 unites maximum/);
  });

  afterAll(async () => {
    await prisma.ecommerceOrderItem.deleteMany({ where: { productId } });
    await prisma.ecommerceOrder.deleteMany({ where: { customerId: (testSession!.user as { customerId: string }).customerId } });
    await prisma.stockMovement.deleteMany({ where: { productId } });
    await prisma.stock.deleteMany({ where: { productId } });
    await prisma.product.delete({ where: { id: productId } });
    await prisma.customer.delete({ where: { id: (testSession!.user as { customerId: string }).customerId } });
    await prisma.user.delete({ where: { id: testSession!.user.id as string } });
    await prisma.store.delete({ where: { id: storeId } });
    await prisma.$disconnect();
  });
});
