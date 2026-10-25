import { describe, it, expect, beforeAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";

// Parcours metier complet, de bout en bout, avec les vraies Server Actions :
// produit -> achat fournisseur -> caisse -> vente avec remise -> debit -> facture -> dette ->
// commande en ligne -> rapports. Chaque etape verifie stock, factures et montants.

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

let testSession: { user: Record<string, unknown> } | null = null;
vi.mock("@/lib/auth", () => ({ auth: async () => testSession }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    const err = new Error(`NEXT_REDIRECT:${url}`);
    (err as { digest?: string }).digest = `NEXT_REDIRECT;replace;${url};307;`;
    throw err;
  },
  unstable_rethrow: (error: unknown) => {
    if (String((error as { digest?: string })?.digest ?? "").startsWith("NEXT_REDIRECT")) throw error;
  },
}));

const { createProduct } = await import("@/lib/actions/products");
const { createCustomer } = await import("@/lib/actions/customers");
const { createSupplierOrder, receiveSupplierOrder } = await import("@/lib/actions/supplier-orders");
const { openCashSession, closeCashSession } = await import("@/lib/actions/cash");
const { createSale } = await import("@/lib/actions/sales");
const { createDebit, transformDebitToInvoice } = await import("@/lib/actions/debits");
const { addInvoicePayment } = await import("@/lib/actions/invoices");
const { settleDebt } = await import("@/lib/actions/debts");
const {
  createEcommerceOrder,
  assignEcommerceOrderStore,
  confirmEcommerceOrder,
  startPreparationEcommerceOrder,
  markDeliveredEcommerceOrder,
} = await import("@/lib/actions/ecommerce");
const { getFullAggregates, parseReportRange } = await import("@/lib/reports");
const { dayKey } = await import("@/lib/dates");

function form(fields: Record<string, string | number>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, String(v));
  return fd;
}

/** Execute une action qui se termine par redirect() et renvoie l'URL de redirection. */
async function redirectOf(promise: Promise<unknown>): Promise<string> {
  try {
    const result = await promise;
    throw new Error(`Pas de redirection, resultat : ${JSON.stringify(result)}`);
  } catch (e) {
    const match = /NEXT_REDIRECT:(.*)$/.exec((e as Error).message);
    if (!match) throw e;
    return match[1];
  }
}

const stockOf = async (productId: string, storeId: string) =>
  prisma.stock.findUnique({ where: { productId_storeId: { productId, storeId } } });

describe("Parcours complet ERP + boutique", () => {
  let storeId: string;
  let productId: string;
  let customerId: string;
  let cashRegisterId: string;
  let cashSessionId: string;
  const productName = `Ciment parcours ${Date.now()}`;

  beforeAll(async () => {
    const store = await prisma.store.create({
      data: { reference: await generateReference("store"), name: "Depot parcours complet" },
    });
    storeId = store.id;
    const admin = await prisma.user.create({
      data: {
        reference: await generateReference("user"),
        name: "Admin parcours",
        email: `admin-parcours-${Date.now()}@example.com`,
        passwordHash: "unused-in-tests",
        role: "ADMIN",
      },
    });
    testSession = {
      user: { id: admin.id, name: admin.name, email: admin.email, role: "ADMIN", reference: admin.reference, storeId: null, customerId: null },
    };
    const register = await prisma.cashRegister.create({
      data: { reference: await generateReference("cashRegister"), number: "P1", name: "Caisse parcours", storeId },
    });
    cashRegisterId = register.id;
  });

  it("cree un produit avec stock initial et un client", async () => {
    const category = await prisma.category.create({ data: { name: `Materiaux parcours ${Date.now()}` } });
    const url = await redirectOf(
      createProduct(
        form({
          name: productName,
          categoryId: category.id,
          purchasePrice: 4000,
          sellingPrice: 5000,
          minThreshold: 2,
          active: "on",
          onlineEnabled: "on",
          storeId,
          initialStock: 10,
        }),
      ),
    );
    expect(url).toMatch(/\/erp\/produits/);
    const product = await prisma.product.findFirstOrThrow({ where: { name: productName } });
    productId = product.id;
    expect(product.reference).toMatch(/^PRD-/);
    expect((await stockOf(productId, storeId))?.quantity).toBe(10);

    await redirectOf(createCustomer(form({ name: "Client Parcours", phone: "771234567" }))).catch(() => undefined);
    const customer = await prisma.customer.findFirstOrThrow({ where: { name: "Client Parcours" }, orderBy: { createdAt: "desc" } });
    customerId = customer.id;
  });

  it("commande fournisseur puis reception partielle et totale : le stock augmente", async () => {
    const supplier = await prisma.supplier.create({
      data: { reference: await generateReference("supplier"), name: "Fournisseur parcours" },
    });
    const url = await redirectOf(
      createSupplierOrder(
        form({ storeId, supplierId: supplier.id, items: JSON.stringify([{ productId, quantity: 6, unitPrice: 4000 }]) }),
      ),
    );
    const orderId = url.split("/").pop()!;
    const order = await prisma.supplierOrder.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    const itemId = order.items[0].id;

    expect(await receiveSupplierOrder(orderId, form({ receipts: JSON.stringify([{ orderItemId: itemId, receivedNow: 2 }]) }))).toBeUndefined();
    expect((await prisma.supplierOrder.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("PARTIELLEMENT_RECUE");
    // On ne peut pas recevoir plus que commande : 10 demandes, 4 restants.
    await receiveSupplierOrder(orderId, form({ receipts: JSON.stringify([{ orderItemId: itemId, receivedNow: 10 }]) }));
    expect((await prisma.supplierOrder.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("RECUE");
    expect((await stockOf(productId, storeId))?.quantity).toBe(16);
  });

  it("ouvre une caisse ; une seconde ouverture de la meme caisse est refusee", async () => {
    expect(await openCashSession(form({ cashRegisterId, openingBalance: 10000 }))).toBeUndefined();
    expect((await openCashSession(form({ cashRegisterId, openingBalance: 0 })))?.error).toMatch(/deja une session/i);
    const session = await prisma.cashSession.findFirstOrThrow({ where: { cashRegisterId, status: "OUVERTE" } });
    cashSessionId = session.id;
  });

  it("vente comptant avec remise : facture payee, stock diminue", async () => {
    const url = await redirectOf(
      createSale(
        form({
          storeId,
          customerName: "Passant",
          discount: 1000,
          paymentOption: `CASH:${cashSessionId}`,
          items: JSON.stringify([{ productId, quantity: 2, unitPrice: 5000 }]),
        }),
      ),
    );
    const sale = await prisma.sale.findUniqueOrThrow({ where: { id: url.split("/").pop()! }, include: { invoice: true } });
    expect(sale.subtotal).toBe(10000);
    expect(sale.total).toBe(9000);
    expect(sale.invoice).toMatchObject({ total: 9000, discount: 1000, paidAmount: 9000, remainingAmount: 0, status: "PAYEE" });
    expect((await stockOf(productId, storeId))?.quantity).toBe(14);
  });

  it("debit : reserve le stock, puis facture avec acompte, reglement puis dette soldee", async () => {
    const debitUrl = await redirectOf(
      createDebit(form({ storeId, customerId, items: JSON.stringify([{ productId, quantity: 3, unitPrice: 5000 }]) })),
    );
    const debitId = debitUrl.split("/").pop()!;
    let stock = await stockOf(productId, storeId);
    expect(stock).toMatchObject({ quantity: 14, reserved: 3 });

    const invoiceUrl = await redirectOf(
      transformDebitToInvoice(debitId, form({ amountPaid: 5000, paymentOption: "METHOD:WAVE" })),
    );
    const invoiceId = invoiceUrl.split("/").pop()!;
    stock = await stockOf(productId, storeId);
    expect(stock).toMatchObject({ quantity: 11, reserved: 0 });

    let invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { debt: true } });
    expect(invoice).toMatchObject({ total: 15000, paidAmount: 5000, remainingAmount: 10000, status: "PARTIELLEMENT_PAYEE" });
    expect(invoice.debt).toMatchObject({ remainingAmount: 10000, status: "PARTIELLEMENT_PAYEE" });

    // Reglement depuis la facture (Orange Money)...
    expect(await addInvoicePayment(invoiceId, form({ amount: 4000, paymentOption: "METHOD:ORANGE_MONEY" }))).toBeUndefined();
    // ... puis solde depuis la page Dettes, en especes dans la caisse ouverte.
    expect(await settleDebt(invoice.debt!.id, form({ amount: 6000, paymentOption: `CASH:${cashSessionId}` }))).toBeUndefined();

    invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { debt: true } });
    expect(invoice).toMatchObject({ paidAmount: 15000, remainingAmount: 0, status: "PAYEE" });
    expect(invoice.debt).toMatchObject({ paidAmount: 15000, remainingAmount: 0, status: "PAYEE" });
    // Un encaissement de trop est refuse.
    expect((await addInvoicePayment(invoiceId, form({ amount: 100, paymentOption: "METHOD:WAVE" })))?.error).toMatch(/soldee/i);
  });

  it("commande en ligne : depot, confirmation, preparation, livraison payee", async () => {
    const realSession = testSession;
    testSession = null; // client de la boutique, sans compte
    const placed = await createEcommerceOrder({
      items: [{ productId, quantity: 1 }],
      customerName: "Client En Ligne",
      customerEmail: "",
      shippingAddress: "Touba, quartier test",
      shippingPhone: "770000001",
      paymentMethod: "ESPECES",
    });
    testSession = realSession;
    if ("error" in placed) throw new Error(placed.error);

    const order = await prisma.ecommerceOrder.findUniqueOrThrow({ where: { id: placed.id } });
    if (!order.storeId) expect(await assignEcommerceOrderStore(placed.id, form({ storeId }))).toBeUndefined();
    expect(await confirmEcommerceOrder(placed.id)).toBeUndefined();
    expect(await startPreparationEcommerceOrder(placed.id)).toBeUndefined();
    expect(await markDeliveredEcommerceOrder(placed.id, form({ paymentOption: `CASH:${cashSessionId}` }))).toBeUndefined();

    const done = await prisma.ecommerceOrder.findUniqueOrThrow({ where: { id: placed.id }, include: { invoice: true } });
    expect(done.status).toBe("LIVREE");
    expect(done.invoice).toMatchObject({ total: 5000, paidAmount: 5000, remainingAmount: 0, status: "PAYEE" });
    const stock = await stockOf(productId, storeId);
    expect(stock!.quantity - stock!.reserved).toBe(10);
  });

  it("cloture de caisse : theorique = fond + especes encaissees (dette comptee une seule fois)", async () => {
    expect(await closeCashSession(cashSessionId, form({ closingBalanceDeclared: 30000 }))).toBeUndefined();
    const session = await prisma.cashSession.findUniqueOrThrow({ where: { id: cashSessionId } });
    // 10 000 de fond + vente 9 000 + dette 6 000 + commande en ligne 5 000.
    expect(session.closingBalanceTheoretical).toBe(30000);
    expect(session.status).toBe("FERMEE");
  });

  it("rapports du jour : CA, marge et quantites coherents avec les ventes du parcours", async () => {
    const today = dayKey(new Date());
    const report = await getFullAggregates(parseReportRange({ from: today, to: today, storeId }, null));
    expect(report.revenue).toBe(9000 + 15000 + 5000);
    expect(report.invoiceCount).toBe(3);
    const line = report.products.find((p) => p.id === productId)!;
    expect(line.quantity).toBe(6);
    expect(line.revenue).toBeCloseTo(29000);
    // Cout : 6 x 4 000 = 24 000.
    expect(report.profit).toBeCloseTo(5000);
    expect(report.revenueByDay.at(-1)).toEqual({ date: today, revenue: 29000 });
  });
});
