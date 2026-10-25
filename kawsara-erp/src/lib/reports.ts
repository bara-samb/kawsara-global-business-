import "server-only";
import { prisma } from "@/lib/prisma";
import type { InvoiceStatus } from "@prisma/client";
import { addDays, dayKey, endOfDay, monthKey, startOfDay } from "@/lib/dates";

export type ReportRange = { from: Date; to: Date; storeId: string | null };

// CA = ventes facturees : une facture impayee (debit transforme, commande en ligne validee) est
// deja une vente, son encaissement est suivi a part (dettes clients).
export const REVENUE_STATUSES: InvoiceStatus[] = ["VALIDEE", "PAYEE", "PARTIELLEMENT_PAYEE", "IMPAYEE"];

function parseDateParam(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseReportRange(
  params: { from?: string; to?: string; storeId?: string },
  forcedStoreId: string | null
): ReportRange {
  // Une date absente ou invalide dans l'URL retombe sur les 30 derniers jours.
  // Journees completes, heure de Dakar (voir lib/dates.ts).
  const to = endOfDay(parseDateParam(params.to) ?? new Date());
  const parsedFrom = parseDateParam(params.from);
  let from = startOfDay(parsedFrom ?? addDays(to, -29));
  if (from > to) from = startOfDay(to);
  return { from, to, storeId: forcedStoreId ?? params.storeId ?? null };
}

export async function getInvoicesInRange(range: ReportRange) {
  return prisma.invoice.findMany({
    where: {
      status: { in: REVENUE_STATUSES },
      createdAt: { gte: range.from, lte: range.to },
      ...(range.storeId ? { storeId: range.storeId } : {}),
    },
    include: { items: { include: { product: true } }, customer: true, store: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getFullAggregates(range: ReportRange) {
  const invoices = await getInvoicesInRange(range);

  let revenue = 0;
  let profit = 0;
  const byDay = new Map<string, number>();
  const byMonth = new Map<string, { revenue: number; invoices: number }>();
  const byProduct = new Map<
    string,
    {
      id: string;
      name: string;
      reference: string;
      quantity: number;
      revenue: number;
      cost: number;
      profit: number;
    }
  >();
  const byCustomer = new Map<
    string,
    { id: string | null; name: string; revenue: number; profit: number; orders: number }
  >();

  for (const invoice of invoices) {
    revenue += invoice.total;
    const day = dayKey(invoice.createdAt);
    byDay.set(day, (byDay.get(day) ?? 0) + invoice.total);
    const month = byMonth.get(monthKey(invoice.createdAt)) ?? { revenue: 0, invoices: 0 };
    month.revenue += invoice.total;
    month.invoices += 1;
    byMonth.set(monthKey(invoice.createdAt), month);

    // La remise globale de la facture (remise sur la vente) est repartie sur les lignes au
    // prorata de leur montant : sans cela, la marge et le CA par produit etaient surestimes et
    // la somme des produits ne retombait pas sur le CA.
    const linesTotal = invoice.items.reduce((s, item) => s + item.total, 0);
    const netRatio = linesTotal > 0 ? invoice.total / linesTotal : 1;

    const customerKey = invoice.customerId ?? "anonyme";
    const customerEntry = byCustomer.get(customerKey) ?? {
      id: invoice.customerId,
      name: invoice.customer?.name ?? "Client comptant",
      revenue: 0,
      profit: 0,
      orders: 0,
    };
    customerEntry.revenue += invoice.total;
    customerEntry.orders += 1;
    byCustomer.set(customerKey, customerEntry);

    for (const item of invoice.items) {
      const itemCost = item.product.purchasePrice * item.quantity;
      const itemRevenue = item.total * netRatio;
      const itemProfit = itemRevenue - itemCost;
      profit += itemProfit;
      customerEntry.profit += itemProfit;
      const entry = byProduct.get(item.productId) ?? {
        id: item.productId,
        name: item.product.name,
        reference: item.product.reference,
        quantity: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      };
      entry.quantity += item.quantity;
      entry.revenue += itemRevenue;
      entry.cost += itemCost;
      entry.profit += itemProfit;
      byProduct.set(item.productId, entry);
    }
  }

  const revenueByDay: { date: string; revenue: number }[] = [];
  for (let cursor = range.from; cursor <= range.to; cursor = addDays(cursor, 1)) {
    revenueByDay.push({ date: dayKey(cursor), revenue: byDay.get(dayKey(cursor)) ?? 0 });
  }
  const revenueByMonth = [...byMonth.entries()]
    .map(([month, v]) => ({ month, ...v }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const products = [...byProduct.values()].sort((a, b) => b.revenue - a.revenue);
  const customers = [...byCustomer.values()].sort((a, b) => b.revenue - a.revenue);

  // Produit le plus vendu = plus grande quantite vendue (a egalite, le plus gros CA).
  const bestSellingProduct =
    [...products].sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)[0] ?? null;
  // Meilleur client = plus gros CA, hors ventes comptant sans client identifie.
  const bestCustomer = customers.find((c) => c.id !== null) ?? null;

  return {
    invoiceCount: invoices.length,
    revenue,
    profit,
    marginRate: revenue > 0 ? (profit / revenue) * 100 : 0,
    averageTicket: invoices.length > 0 ? revenue / invoices.length : 0,
    revenueByDay,
    revenueByMonth,
    products,
    customers,
    bestSellingProduct,
    bestCustomer,
  };
}

export async function getDormantProducts(soldProductIds: string[], limit = 10) {
  const products = await prisma.product.findMany({
    where: { active: true, id: { notIn: soldProductIds } },
    include: { stocks: true },
  });
  return products
    .map((p) => ({
      reference: p.reference,
      name: p.name,
      stock: p.stocks.reduce((s, st) => s + st.quantity, 0),
    }))
    .filter((p) => p.stock > 0)
    .sort((a, b) => b.stock - a.stock)
    .slice(0, limit);
}

export async function getAtRiskCustomers(limit = 10) {
  const debts = await prisma.customerDebt.findMany({
    where: { remainingAmount: { gt: 0 } },
    include: { customer: true },
  });
  const byCustomer = new Map<string, { name: string; remaining: number; debtCount: number }>();
  for (const d of debts) {
    const entry = byCustomer.get(d.customerId) ?? { name: d.customer.name, remaining: 0, debtCount: 0 };
    entry.remaining += d.remainingAmount;
    entry.debtCount += 1;
    byCustomer.set(d.customerId, entry);
  }
  return [...byCustomer.values()].sort((a, b) => b.remaining - a.remaining).slice(0, limit);
}

export async function getLowStockReport(storeId: string | null) {
  const stocks = await prisma.stock.findMany({
    where: storeId ? { storeId } : {},
    include: { product: true, store: true },
  });
  return stocks
    .filter((s) => s.quantity <= s.product.minThreshold)
    .sort((a, b) => a.quantity - b.quantity)
    .map((s) => ({
      reference: s.product.reference,
      name: s.product.name,
      store: s.store.name,
      quantity: s.quantity,
      minThreshold: s.product.minThreshold,
    }));
}
