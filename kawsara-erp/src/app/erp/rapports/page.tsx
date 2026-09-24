import Link from "next/link";
import {
  Download,
  TrendingUp,
  Percent,
  Receipt,
  ShoppingBasket,
  PackageX,
  UserX,
  AlertTriangle,
  Trophy,
  Crown,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  parseReportRange,
  getFullAggregates,
  getLowStockReport,
  getDormantProducts,
  getAtRiskCustomers,
} from "@/lib/reports";
import { RevenueChart } from "@/components/erp/revenue-chart";
import { PrintButton } from "@/components/erp/print-button";

function ExportLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-1 text-xs font-semibold text-brand-green-700 transition hover:text-brand-gold-600 print:hidden"
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}

function fcfa(n: number) {
  return `${Math.round(n).toLocaleString("fr-FR")} FCFA`;
}

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function RapportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; storeId?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const forcedStoreId = session!.user.storeId;

  const range = parseReportRange(params, forcedStoreId);
  const [summary, lowStock, stores] = await Promise.all([
    getFullAggregates(range),
    getLowStockReport(range.storeId),
    forcedStoreId ? Promise.resolve([]) : prisma.store.findMany({ orderBy: { name: "asc" } }),
  ]);
  const [dormantProducts, atRiskCustomers] = await Promise.all([
    getDormantProducts(summary.products.map((p) => p.id), 10),
    getAtRiskCustomers(10),
  ]);

  const productsByProfit = [...summary.products].sort((a, b) => b.profit - a.profit);

  const exportQuery = `from=${toDateInput(range.from)}&to=${toDateInput(range.to)}${range.storeId ? `&storeId=${range.storeId}` : ""}`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-brand-green-900">Rapports &amp; statistiques</h1>
          <p className="text-sm text-gray-500">
            Du {range.from.toLocaleDateString("fr-FR")} au {range.to.toLocaleDateString("fr-FR")}
          </p>
        </div>
        <PrintButton />
      </div>

      <form className="mt-4 flex flex-wrap items-end gap-3 print:hidden" action="/erp/rapports">
        <div>
          <label className="text-xs font-medium text-brand-green-900">Du</label>
          <input type="date" name="from" defaultValue={toDateInput(range.from)} className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-brand-green-900">Au</label>
          <input type="date" name="to" defaultValue={toDateInput(range.to)} className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        {!forcedStoreId && (
          <div>
            <label className="text-xs font-medium text-brand-green-900">Boutique</label>
            <select name="storeId" defaultValue={range.storeId ?? ""} className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Toutes les boutiques</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
        <button className="rounded-md bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-800">
          Appliquer
        </button>
      </form>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="animate-fade-in-up rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-green-100 text-brand-green-700">
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Chiffre d&apos;affaires</p>
          <p className="mt-1 text-2xl font-bold text-brand-green-900">{fcfa(summary.revenue)}</p>
        </div>
        <div className="animate-fade-in-up rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" style={{ animationDelay: "40ms" }}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gold-100 text-brand-gold-700">
            <Percent className="h-5 w-5" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Marge brute</p>
          <p className="mt-1 text-2xl font-bold text-brand-green-900">{fcfa(summary.profit)}</p>
          <p className="text-xs text-gray-400">Taux : {summary.marginRate.toFixed(1)}%</p>
        </div>
        <div className="animate-fade-in-up rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" style={{ animationDelay: "80ms" }}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
            <Receipt className="h-5 w-5" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Factures</p>
          <p className="mt-1 text-2xl font-bold text-brand-green-900">{summary.invoiceCount}</p>
        </div>
        <div className="animate-fade-in-up rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" style={{ animationDelay: "120ms" }}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
            <ShoppingBasket className="h-5 w-5" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Panier moyen</p>
          <p className="mt-1 text-2xl font-bold text-brand-green-900">{fcfa(summary.averageTicket)}</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-brand-green-900">Chiffre d&apos;affaires par jour</p>
          <ExportLink href={`/erp/rapports/export/ventes?${exportQuery}`} label="Exporter les ventes (CSV)" />
        </div>
        <div className="mt-3">
          <RevenueChart data={summary.revenueByDay} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-green-100 text-brand-green-700">
            <Trophy className="h-5 w-5" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Produit le plus vendu</p>
          {summary.bestSellingProduct ? (
            <>
              <p className="mt-1 text-lg font-bold text-brand-green-900">
                <Link href={`/erp/produits/${summary.bestSellingProduct.id}`} className="hover:underline">
                  {summary.bestSellingProduct.name}
                </Link>
              </p>
              <p className="text-xs text-gray-500">
                {summary.bestSellingProduct.quantity} vendu(s) · CA {fcfa(summary.bestSellingProduct.revenue)} · Benefice{" "}
                <span className="font-semibold text-brand-green-700">{fcfa(summary.bestSellingProduct.profit)}</span>
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-gray-400">Aucune vente sur la periode.</p>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gold-100 text-brand-gold-700">
            <Crown className="h-5 w-5" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Meilleur client</p>
          {summary.bestCustomer?.id ? (
            <>
              <p className="mt-1 text-lg font-bold text-brand-green-900">
                <Link href={`/erp/clients/${summary.bestCustomer.id}`} className="hover:underline">
                  {summary.bestCustomer.name}
                </Link>
              </p>
              <p className="text-xs text-gray-500">
                {summary.bestCustomer.orders} facture(s) · CA{" "}
                <span className="font-semibold text-brand-green-700">{fcfa(summary.bestCustomer.revenue)}</span>
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-gray-400">Aucun client identifie sur la periode.</p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-brand-green-900">Benefice par produit</p>
          <ExportLink href={`/erp/rapports/export/produits?${exportQuery}`} label="Exporter CSV" />
        </div>
        <div className="mt-3 max-h-[28rem] overflow-auto print:max-h-none">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-white text-left text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="py-1.5 pr-3">Produit</th>
                <th className="py-1.5 pr-3 text-right">Qte vendue</th>
                <th className="py-1.5 pr-3 text-right">CA</th>
                <th className="py-1.5 pr-3 text-right">Cout d&apos;achat</th>
                <th className="py-1.5 pr-3 text-right">Benefice</th>
                <th className="py-1.5 text-right">Marge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {productsByProfit.map((p) => (
                <tr key={p.id}>
                  <td className="py-1.5 pr-3">
                    <Link href={`/erp/produits/${p.id}`} className="hover:underline">{p.name}</Link>
                    <span className="ml-1 text-xs text-gray-400">{p.reference}</span>
                  </td>
                  <td className="py-1.5 pr-3 text-right">{p.quantity}</td>
                  <td className="py-1.5 pr-3 text-right font-medium">{fcfa(p.revenue)}</td>
                  <td className="py-1.5 pr-3 text-right text-gray-500">{fcfa(p.cost)}</td>
                  <td className={`py-1.5 pr-3 text-right font-semibold ${p.profit < 0 ? "text-red-600" : "text-brand-green-700"}`}>
                    {fcfa(p.profit)}
                  </td>
                  <td className="py-1.5 text-right text-gray-500">
                    {p.revenue > 0 ? `${((p.profit / p.revenue) * 100).toFixed(1)}%` : "-"}
                  </td>
                </tr>
              ))}
              {productsByProfit.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-gray-400">Aucune vente sur la periode.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-brand-green-900">Chiffre d&apos;affaires par client</p>
          <ExportLink href={`/erp/rapports/export/clients?${exportQuery}`} label="Exporter CSV" />
        </div>
        <div className="mt-3 max-h-[28rem] overflow-auto print:max-h-none">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-white text-left text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="py-1.5 pr-3">Client</th>
                <th className="py-1.5 pr-3 text-right">Factures</th>
                <th className="py-1.5 pr-3 text-right">CA</th>
                <th className="py-1.5 pr-3 text-right">Part du CA</th>
                <th className="py-1.5 text-right">Benefice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summary.customers.map((c) => (
                <tr key={c.id ?? "anonyme"}>
                  <td className="py-1.5 pr-3">
                    {c.id ? (
                      <Link href={`/erp/clients/${c.id}`} className="hover:underline">{c.name}</Link>
                    ) : (
                      <span className="italic text-gray-500">{c.name}</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3 text-right">{c.orders}</td>
                  <td className="py-1.5 pr-3 text-right font-medium">{fcfa(c.revenue)}</td>
                  <td className="py-1.5 pr-3 text-right text-gray-500">
                    {summary.revenue > 0 ? `${((c.revenue / summary.revenue) * 100).toFixed(1)}%` : "-"}
                  </td>
                  <td className={`py-1.5 text-right ${c.profit < 0 ? "text-red-600" : "text-brand-green-700"}`}>
                    {fcfa(c.profit)}
                  </td>
                </tr>
              ))}
              {summary.customers.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-gray-400">Aucune vente sur la periode.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold text-brand-green-900">
            <AlertTriangle className="h-4 w-4 text-brand-gold-600" />
            Stock bas / ruptures
          </p>
          <ExportLink href={`/erp/rapports/export/stock?${exportQuery}`} label="Exporter CSV" />
        </div>
        <table className="mt-3 min-w-full text-sm">
          <thead className="text-left text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="py-1.5">Produit</th>
              <th className="py-1.5">Boutique</th>
              <th className="py-1.5">Stock</th>
              <th className="py-1.5">Seuil</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lowStock.map((s, i) => (
              <tr key={`${s.reference}-${i}`}>
                <td className="py-1.5">{s.name}</td>
                <td className="py-1.5 text-gray-500">{s.store}</td>
                <td className={`py-1.5 font-semibold ${s.quantity <= 0 ? "text-red-600" : "text-brand-gold-700"}`}>{s.quantity}</td>
                <td className="py-1.5 text-gray-500">{s.minThreshold}</td>
              </tr>
            ))}
            {lowStock.length === 0 && (
              <tr><td colSpan={4} className="py-6 text-center text-gray-400">Aucune alerte de stock.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-brand-green-900">
            <PackageX className="h-4 w-4 text-gray-400" />
            Produits dormants (aucune vente sur la periode, stock immobilise)
          </p>
          <table className="mt-3 min-w-full text-sm">
            <thead className="text-left text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="py-1.5">Produit</th>
                <th className="py-1.5">Stock total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dormantProducts.map((p) => (
                <tr key={p.reference}>
                  <td className="py-1.5">{p.name}</td>
                  <td className="py-1.5 font-semibold text-brand-gold-700">{p.stock}</td>
                </tr>
              ))}
              {dormantProducts.length === 0 && (
                <tr><td colSpan={2} className="py-6 text-center text-gray-400">Aucun produit dormant.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-brand-green-900">
            <UserX className="h-4 w-4 text-red-500" />
            Clients a risque (creances non soldees)
          </p>
          <table className="mt-3 min-w-full text-sm">
            <thead className="text-left text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="py-1.5">Client</th>
                <th className="py-1.5">Dettes</th>
                <th className="py-1.5">Reste du</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {atRiskCustomers.map((c) => (
                <tr key={c.name}>
                  <td className="py-1.5">{c.name}</td>
                  <td className="py-1.5">{c.debtCount}</td>
                  <td className="py-1.5 font-semibold text-red-600">{fcfa(c.remaining)}</td>
                </tr>
              ))}
              {atRiskCustomers.length === 0 && (
                <tr><td colSpan={3} className="py-6 text-center text-gray-400">Aucun client a risque.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
