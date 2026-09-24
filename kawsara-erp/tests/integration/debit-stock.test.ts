import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

let testSession: { user: Record<string, unknown> } | null = null;
vi.mock("@/lib/auth", () => ({ auth: async () => testSession }));

const redirects: string[] = [];
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    redirects.push(url);
    const err = new Error(`NEXT_REDIRECT:${url}`);
    (err as { digest?: string }).digest = `NEXT_REDIRECT;replace;${url};307;`;
    throw err;
  },
  // Comme le vrai unstable_rethrow : laisse passer les redirections interceptees par runAction.
  unstable_rethrow: (error: unknown) => {
    if (String((error as { digest?: string })?.digest ?? "").startsWith("NEXT_REDIRECT")) throw error;
  },
}));

const { createDebit, transformDebitToInvoice, cancelDebit } = await import("@/lib/actions/debits");

describe("Debits : reservation sans diminuer le stock physique (criteres 58.3 et 58.4)", () => {
  let storeId: string;
  let productId: string;
  let customerId: string;

  beforeAll(async () => {
    const store = await prisma.store.create({
      data: { reference: await generateReference("store"), name: "Boutique test debit" },
    });
    storeId = store.id;

    const user = await prisma.user.create({
      data: {
        reference: await generateReference("user"),
        name: "Caissier Vitest",
        email: `caissier-vitest-${Date.now()}@example.com`,
        passwordHash: "unused-in-tests",
        role: "CAISSIER",
        storeId,
      },
    });
    testSession = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: "CAISSIER",
        reference: user.reference,
        storeId,
        customerId: null,
      },
    };

    const customer = await prisma.customer.create({
      data: { reference: await generateReference("customer"), name: "Client debit test" },
    });
    customerId = customer.id;

    const product = await prisma.product.create({
      data: {
        reference: await generateReference("product"),
        name: "Produit test debit",
        purchasePrice: 1000,
        sellingPrice: 2000,
        active: true,
        stocks: { create: { storeId, quantity: 10 } },
      },
    });
    productId = product.id;
  });

  function debitFormData(quantity: number) {
    const fd = new FormData();
    fd.set("storeId", storeId);
    fd.set("customerId", customerId);
    fd.set("items", JSON.stringify([{ productId, quantity, unitPrice: 2000 }]));
    return fd;
  }

  it("un debit reserve le stock SANS diminuer la quantite physique", async () => {
    await createDebit(debitFormData(3)).catch(() => {});

    const stock = await prisma.stock.findUnique({ where: { productId_storeId: { productId, storeId } } });
    expect(stock?.quantity).toBe(10); // inchange : c'est le critere d'acceptation 58.3
    expect(stock?.reserved).toBe(3);
  });

  it("la transformation en facture verifie de nouveau le stock puis effectue la sortie reelle", async () => {
    const debit = await prisma.debit.findFirst({ where: { customerId, storeId }, orderBy: { createdAt: "desc" } });
    expect(debit).not.toBeNull();

    const fd = new FormData();
    fd.set("amountPaid", "0");
    await transformDebitToInvoice(debit!.id, fd).catch(() => {});

    const stock = await prisma.stock.findUnique({ where: { productId_storeId: { productId, storeId } } });
    expect(stock?.quantity).toBe(7); // 10 - 3, sortie reelle a la transformation
    expect(stock?.reserved).toBe(0);

    const updated = await prisma.debit.findUnique({ where: { id: debit!.id } });
    expect(updated?.status).toBe("TRANSFORME");

    const invoice = await prisma.invoice.findUnique({ where: { debitId: debit!.id } });
    expect(invoice).not.toBeNull();
    expect(invoice?.origin).toBe("DEBIT");
  });

  it("annuler un debit en attente libere la reservation sans toucher au stock physique", async () => {
    await createDebit(debitFormData(2)).catch(() => {});
    const debit = await prisma.debit.findFirst({ where: { customerId, storeId, status: "EN_ATTENTE" } });
    expect(debit).not.toBeNull();

    const beforeCancel = await prisma.stock.findUnique({ where: { productId_storeId: { productId, storeId } } });
    expect(beforeCancel?.reserved).toBe(2);

    // L'annulation est une action dangereuse : un caissier est refuse, seul l'admin principal passe.
    expect(await cancelDebit(debit!.id)).toEqual({
      error: "Acces refuse : seul l'administrateur principal peut annuler un debit.",
    });
    const userId = testSession!.user.id as string;
    await prisma.user.update({ where: { id: userId }, data: { role: "ADMIN", isPrincipalAdmin: true } });
    testSession!.user.role = "ADMIN";
    await cancelDebit(debit!.id);

    const afterCancel = await prisma.stock.findUnique({ where: { productId_storeId: { productId, storeId } } });
    expect(afterCancel?.reserved).toBe(0);
    expect(afterCancel?.quantity).toBe(7); // toujours inchange par rapport au test precedent

    const updated = await prisma.debit.findUnique({ where: { id: debit!.id } });
    expect(updated?.status).toBe("ANNULE");
  });

  it("refuse un debit dont la quantite depasse le stock disponible", async () => {
    expect((await createDebit(debitFormData(1000)))?.error).toMatch(/stock insuffisant/i);
  });

  afterAll(async () => {
    const invoices = await prisma.invoice.findMany({ where: { items: { some: { productId } } } });
    const invoiceIds = invoices.map((inv) => inv.id);
    for (const id of invoiceIds) {
      await prisma.debtPayment.deleteMany({ where: { debt: { invoiceId: id } } });
      await prisma.customerDebt.deleteMany({ where: { invoiceId: id } });
      await prisma.payment.deleteMany({ where: { invoiceId: id } });
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
    }
    await prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
    await prisma.debitItem.deleteMany({ where: { productId } });
    await prisma.debit.deleteMany({ where: { customerId } });
    await prisma.stockMovement.deleteMany({ where: { productId } });
    await prisma.stock.deleteMany({ where: { productId } });
    await prisma.product.delete({ where: { id: productId } });
    await prisma.customer.delete({ where: { id: customerId } });
    await prisma.user.delete({ where: { id: testSession!.user.id as string } });
    await prisma.store.delete({ where: { id: storeId } });
    await prisma.$disconnect();
  });
});
