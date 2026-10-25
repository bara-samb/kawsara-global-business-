import {
  TrendingUp,
  Wallet,
  Package,
  Users,
  AlertTriangle,
  HandCoins,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { REVENUE_STATUSES } from "@/lib/reports";
import { dayKey, startOfDay, startOfMonth, startOfWeek } from "@/lib/dates";

function fcfa(n: number) {
  return `${n.toLocaleString("fr-FR")} FCFA`;
}

async function getStats(storeId: string | null) {
  const storeFilter = storeId ? { storeId } : {};
  // CA = factures non annulees (meme definition que les rapports, voir REVENUE_STATUSES),
  // calcule par la base : pas besoin de charger toutes les factures en memoire.
  const revenueSince = (from?: Date) =>
    prisma.invoice.aggregate({
      where: { status: { in: REVENUE_STATUSES }, ...storeFilter, ...(from ? { createdAt: { gte: from } } : {}) },
      _sum: { total: true },
      _count: true,
    });
  try {
    const [productCount, customerCount, lowStock, today, week, month, allTime, debts] = await Promise.all([
      prisma.product.count({ where: { active: true } }),
      prisma.customer.count(),
      prisma.stock.findMany({
        where: storeId ? { storeId } : {},
        include: { product: true, store: true },
      }),
      revenueSince(startOfDay()),
      revenueSince(startOfWeek()),
      revenueSince(startOfMonth()),
      revenueSince(),
      prisma.customerDebt.aggregate({
        where: {
          status: { in: ["NON_PAYEE", "PARTIELLEMENT_PAYEE", "EN_RETARD"] },
          ...(storeId ? { invoice: { storeId } } : {}),
        },
        _sum: { remainingAmount: true },
      }),
    ]);

    const criticalItems = lowStock.filter((s) => s.quantity <= s.product.minThreshold);

    return {
      productCount,
      customerCount,
      criticalStock: criticalItems.length,
      criticalItems: criticalItems
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 8)
        .map((s) => ({ id: s.id, name: `${s.product.name} — ${s.store.name}`, quantity: s.quantity, minThreshold: s.product.minThreshold })),
      revenueToday: today._sum.total ?? 0,
      revenueWeek: week._sum.total ?? 0,
      revenueMonth: month._sum.total ?? 0,
      revenueTotal: allTime._sum.total ?? 0,
      totalDebt: debts._sum.remainingAmount ?? 0,
      invoiceCount: allTime._count,
      ready: true,
    };
  } catch {
    return {
      productCount: 0,
      customerCount: 0,
      criticalStock: 0,
      criticalItems: [] as { id: string; name: string; quantity: number; minThreshold: number }[],
      revenueToday: 0,
      revenueWeek: 0,
      revenueMonth: 0,
      revenueTotal: 0,
      totalDebt: 0,
      invoiceCount: 0,
      ready: false,
    };
  }
}

export default async function ErpDashboardPage() {
  const session = await auth();
  const role = session!.user.role;
  const stats = await getStats(session!.user.storeId);

  const cards: { label: string; value: string | number; show: boolean; icon: LucideIcon; accent: string; href?: string }[] = [
    { label: "Chiffre d'affaires (aujourd'hui)", value: fcfa(stats.revenueToday), show: can(role, "profit.view") || can(role, "report.view"), icon: TrendingUp, accent: "bg-brand-green-100 text-brand-green-700" },
    { label: "Chiffre d'affaires (semaine)", value: fcfa(stats.revenueWeek), show: can(role, "profit.view") || can(role, "report.view"), icon: TrendingUp, accent: "bg-brand-green-100 text-brand-green-700" },
    { label: "Chiffre d'affaires (mois)", value: fcfa(stats.revenueMonth), show: can(role, "profit.view") || can(role, "report.view"), icon: TrendingUp, accent: "bg-brand-green-100 text-brand-green-700", href: can(role, "report.view") ? `/erp/rapports?from=${dayKey(startOfMonth())}` : undefined },
    { label: "Chiffre d'affaires (total)", value: fcfa(stats.revenueTotal), show: can(role, "profit.view"), icon: HandCoins, accent: "bg-brand-gold-100 text-brand-gold-700" },
    { label: "Produits actifs", value: stats.productCount, show: can(role, "product.read"), icon: Package, accent: "bg-blue-100 text-blue-700" },
    { label: "Clients", value: stats.customerCount, show: can(role, "customer.read"), icon: Users, accent: "bg-purple-100 text-purple-700" },
    { label: "Stock critique", value: stats.criticalStock, show: can(role, "stock.read"), icon: AlertTriangle, accent: "bg-red-100 text-red-700", href: "/erp/stock?critique=1" },
    { label: "Creances clients", value: fcfa(stats.totalDebt), show: can(role, "debt.read"), icon: Wallet, accent: "bg-orange-100 text-orange-700" },
    { label: "Factures", value: stats.invoiceCount, show: can(role, "invoice.read"), icon: Receipt, accent: "bg-teal-100 text-teal-700" },
  ].filter((c) => c.show);

  return (
    <div>
      <h1 className="text-xl font-bold text-brand-green-900">Tableau de bord</h1>
      <p className="text-sm text-gray-500">
        Bienvenue, {session!.user.name}. Voici la situation commerciale
        {session!.user.storeId ? " de votre boutique" : " consolidee"}.
      </p>

      {!stats.ready && (
        <p className="mt-4 rounded-md bg-brand-gold-50 px-3 py-2 text-sm text-brand-gold-700">
          Base de donnees non initialisee : executez les migrations et le seed pour voir des
          donnees reelles.
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          c.href ? (
            <Link
              href={c.href}
              key={c.label}
              style={{ animationDelay: `${i * 40}ms` }}
              className="animate-fade-in-up rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.accent}`}>
                <c.icon className="h-5 w-5" />
              </div>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">{c.label}</p>
              <p className="mt-1 text-2xl font-bold text-brand-green-900">{c.value}</p>
            </Link>
          ) : (
          <div
            key={c.label}
            style={{ animationDelay: `${i * 40}ms` }}
            className="animate-fade-in-up rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.accent}`}>
              <c.icon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-brand-green-900">{c.value}</p>
          </div>
          )
        ))}
      </div>

      {can(role, "stock.read") && stats.criticalItems.length > 0 && (
        <div className="animate-fade-in-up mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-semibold text-brand-green-900">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Ruptures / stock bas
          </p>
          <ul className="mt-3 divide-y divide-gray-100 text-sm">
            {stats.criticalItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between py-2">
                <span>{item.name}</span>
                <span className={item.quantity <= 0 ? "font-semibold text-red-600" : "font-semibold text-brand-gold-700"}>
                  {item.quantity <= 0 ? "Rupture" : `${item.quantity} / seuil ${item.minThreshold}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
