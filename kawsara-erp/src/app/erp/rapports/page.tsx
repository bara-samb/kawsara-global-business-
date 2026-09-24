import { Download, TrendingUp, Percent, Receipt, ShoppingBasket, PackageX, UserX, AlertTriangle } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  parseReportRange,
  getReportSummary,
  getLowStockReport,
  getDormantProducts,
  getAtRiskCustomers,
} from "@/lib/reports";
import { RevenueChart } from "@/components/erp/revenue-chart";
import { PrintButton } from "@/components/erp/print-button";
import { requirePagePermission } from "@/lib/require-permission";

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
  await requirePagePermission("report.view");
  const params = await searchParams;
  const session = await auth();
  const forcedStoreId = session!.user.storeId;

  const range = parseReportRange(params, forcedStoreId);
  const [summary, lowStock, stores] = await Promise.all([
    getReportSummary(range),
    getLowStockReport(range.storeId),
    forcedStoreId ? Promise.resolve([]) : prisma.store.findMany({ orderBy: { name: "asc" } }),
  ]);
  const [dormantProducts, atRiskCustomers] = await Promise.all([
    getDormantProducts(summary.products.map((p) => p.id), 10),
    getAtRiskCustomers(10),
  ]);

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

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-brand-green-900">Top produits</p>
            <ExportLink href={`/erp/rapports/export/produits?${exportQuery}`} label="Exporter CSV" />
          </div>
          <table className="mt-3 min-w-full text-sm">
            <thead className="text-left text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="py-1.5">Produit</th>
                <th className="py-1.5">Qte</th>
                <th className="py-1.5">CA</th>
                <th className="py-1.5">Marge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summary.topProducts.map((p) => (
                <tr key={p.reference}>
                  <td className="py-1.5">{p.name}</td>
                  <td className="py-1.5">{p.quantity}</td>
                  <td className="py-1.5 font-medium">{fcfa(p.revenue)}</td>
                  <td className="py-1.5 text-brand-green-700">{fcfa(p.profit)}</td>
                </tr>
              ))}
              {summary.topProducts.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-gray-400">Aucune vente sur la periode.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-brand-green-900">Top clients</p>
            <ExportLink href={`/erp/rapports/export/clients?${exportQuery}`} label="Exporter CSV" />
          </div>
          <table className="mt-3 min-w-full text-sm">
            <thead className="text-left text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="py-1.5">Client</th>
                <th className="py-1.5">Commandes</th>
                <th className="py-1.5">CA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summary.topCustomers.map((c) => (
                <tr key={c.name}>
                  <td className="py-1.5">{c.name}</td>
                  <td className="py-1.5">{c.orders}</td>
                  <td className="py-1.5 font-medium">{fcfa(c.revenue)}</td>
                </tr>
              ))}
              {summary.topCustomers.length === 0 && (
                <tr><td colSpan={3} className="py-6 text-center text-gray-400">Aucune vente sur la periode.</td></tr>
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
