import "server-only";
import { prisma } from "@/lib/prisma";
import type { InvoiceStatus } from "@prisma/client";

export type ReportRange = { from: Date; to: Date; storeId: string | null };

const REVENUE_STATUSES: InvoiceStatus[] = ["VALIDEE", "PAYEE", "PARTIELLEMENT_PAYEE"];

export function parseReportRange(
  params: { from?: string; to?: string; storeId?: string },
  forcedStoreId: string | null
): ReportRange {
  const to = params.to ? new Date(params.to) : new Date();
  to.setHours(23, 59, 59, 999);
  const from = params.from ? new Date(params.from) : new Date(to);
  if (!params.from) {
    from.setDate(from.getDate() - 29);
  }
  from.setHours(0, 0, 0, 0);
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
  const byProduct = new Map<
    string,
    { id: string; name: string; reference: string; quantity: number; revenue: number; profit: number }
  >();
  const byCustomer = new Map<string, { name: string; revenue: number; orders: number }>();

  for (const invoice of invoices) {
    revenue += invoice.total;
    const day = invoice.createdAt.toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + invoice.total);

    const customerKey = invoice.customerId ?? "anonyme";
    const customerEntry = byCustomer.get(customerKey) ?? {
      name: invoice.customer?.name ?? "Client comptant",
      revenue: 0,
      orders: 0,
    };
    customerEntry.revenue += invoice.total;
    customerEntry.orders += 1;
    byCustomer.set(customerKey, customerEntry);

    for (const item of invoice.items) {
      const itemProfit = (item.unitPrice - item.product.purchasePrice) * item.quantity - item.discount;
      profit += itemProfit;
      const entry = byProduct.get(item.productId) ?? {
        id: item.productId,
        name: item.product.name,
        reference: item.product.reference,
        quantity: 0,
        revenue: 0,
        profit: 0,
      };
      entry.quantity += item.quantity;
      entry.revenue += item.total;
      entry.profit += itemProfit;
      byProduct.set(item.productId, entry);
    }
  }

  const revenueByDay: { date: string; revenue: number }[] = [];
  const cursor = new Date(range.from);
  while (cursor <= range.to) {
    const key = cursor.toISOString().slice(0, 10);
    revenueByDay.push({ date: key, revenue: byDay.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  const products = [...byProduct.values()].sort((a, b) => b.revenue - a.revenue);
  const customers = [...byCustomer.values()].sort((a, b) => b.revenue - a.revenue);

  return {
    invoiceCount: invoices.length,
    revenue,
    profit,
    marginRate: revenue > 0 ? (profit / revenue) * 100 : 0,
    averageTicket: invoices.length > 0 ? revenue / invoices.length : 0,
    revenueByDay,
    products,
    customers,
  };
}

export async function getReportSummary(range: ReportRange) {
  const aggregates = await getFullAggregates(range);
  return {
    ...aggregates,
    topProducts: aggregates.products.slice(0, 10),
    topCustomers: aggregates.customers.slice(0, 10),
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
