import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { updateCustomer } from "@/lib/actions/customers";

const DEBT_LABELS: Record<string, string> = {
  NON_PAYEE: "Non payee",
  PARTIELLEMENT_PAYEE: "Partiellement payee",
  PAYEE: "Payee",
  EN_RETARD: "En retard",
  ANNULEE: "Annulee",
};

const PERIOD_LABELS: Record<string, string> = { jour: "Aujourd'hui", semaine: "Cette semaine", mois: "Ce mois-ci" };

function periodStart(period: string): Date {
  const now = new Date();
  if (period === "semaine") {
    const day = now.getDay() === 0 ? 7 : now.getDay();
    const start = new Date(now);
    start.setDate(now.getDate() - (day - 1));
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (period === "mois") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { id } = await params;
  const { period: periodParam } = await searchParams;
  const period = periodParam && PERIOD_LABELS[periodParam] ? periodParam : "jour";

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      invoices: { orderBy: { createdAt: "desc" }, take: 20 },
      debts: { include: { payments: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!customer) notFound();

  const purchases = await prisma.invoice.findMany({
    where: { customerId: id, createdAt: { gte: periodStart(period) } },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
  const purchasesTotal = purchases.reduce((s, i) => s + i.total, 0);

  const totalInvoiced = customer.invoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = customer.invoices.reduce((s, i) => s + i.paidAmount, 0);
  const totalDue = customer.debts
    .filter((d) => d.status !== "PAYEE" && d.status !== "ANNULEE")
    .reduce((s, d) => s + d.remainingAmount, 0);
  const unpaidInvoiceCount = customer.invoices.filter((i) => i.status !== "PAYEE" && i.status !== "ANNULEE").length;

  const boundUpdate = updateCustomer.bind(null, customer.id);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand-green-900">{customer.name}</h1>
        <p className="font-mono text-xs text-gray-500">{customer.reference}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase text-gray-500">Total facture</p>
          <p className="mt-1 text-lg font-bold text-brand-green-900">{totalInvoiced.toLocaleString("fr-FR")} FCFA</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase text-gray-500">Total paye</p>
          <p className="mt-1 text-lg font-bold text-brand-green-900">{totalPaid.toLocaleString("fr-FR")} FCFA</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase text-gray-500">Reste du</p>
          <p className="mt-1 text-lg font-bold text-red-600">{totalDue.toLocaleString("fr-FR")} FCFA</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase text-gray-500">Factures impayees</p>
          <p className="mt-1 text-lg font-bold text-brand-green-900">{unpaidInvoiceCount}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-brand-green-900">Achats — {PERIOD_LABELS[period]}</h2>
          <div className="flex gap-1 text-xs font-semibold">
            {Object.entries(PERIOD_LABELS).map(([key, label]) => (
              <Link
                key={key}
                href={`/erp/clients/${customer.id}?period=${key}`}
                className={
                  period === key
                    ? "rounded-md bg-brand-green-700 px-3 py-1.5 text-white"
                    : "rounded-md border border-gray-300 px-3 py-1.5 text-gray-600 hover:bg-gray-50"
                }
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          {purchases.length} facture(s) — total{" "}
          <span className="font-semibold text-brand-green-900">{purchasesTotal.toLocaleString("fr-FR")} FCFA</span>
        </p>
        {purchases.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">Aucun achat sur cette periode.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {purchases.map((inv) => (
              <li key={inv.id} className="border-t border-gray-100 pt-2 first:border-t-0 first:pt-0">
                <div className="flex justify-between">
                  <Link href={`/erp/factures/${inv.id}`} className="font-mono text-xs text-brand-green-700 hover:underline">{inv.reference}</Link>
                  <span className="text-xs text-gray-400">{new Date(inv.createdAt).toLocaleString("fr-FR")}</span>
                </div>
                <ul className="mt-1 pl-3 text-xs text-gray-600">
                  {inv.items.map((it) => (
                    <li key={it.id}>{it.quantity} x {it.product.name} — {it.total.toLocaleString("fr-FR")} FCFA</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="font-semibold text-brand-green-900">Dettes et reglements</h2>
        {customer.debts.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">Aucune dette enregistree.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100 text-sm">
            {customer.debts.map((d) => (
              <li key={d.id} className="py-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-gray-500">{d.reference}</span>
                  <span className="text-xs font-semibold text-brand-green-700">{DEBT_LABELS[d.status]}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span>Total : {d.totalAmount.toLocaleString("fr-FR")} FCFA</span>
                  <span>Paye : {d.paidAmount.toLocaleString("fr-FR")} FCFA</span>
                  <span className="font-semibold text-red-600">Reste : {d.remainingAmount.toLocaleString("fr-FR")} FCFA</span>
                </div>
                {d.payments.length > 0 && (
                  <ul className="mt-2 space-y-1 pl-4 text-xs text-gray-500">
                    {d.payments.map((p) => (
                      <li key={p.id}>
                        {new Date(p.createdAt).toLocaleDateString("fr-FR")} — {p.amount.toLocaleString("fr-FR")} FCFA ({p.method})
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="font-semibold text-brand-green-900">Historique des factures</h2>
        {customer.invoices.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">Aucune facture.</p>
        ) : (
          <table className="mt-3 min-w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="py-1">Reference</th>
                <th className="py-1">Date</th>
                <th className="py-1">Total</th>
                <th className="py-1">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customer.invoices.map((i) => (
                <tr key={i.id}>
                  <td className="py-2">
                    <Link href={`/erp/factures/${i.id}`} className="text-brand-green-700 hover:underline">{i.reference}</Link>
                  </td>
                  <td className="py-2">{new Date(i.createdAt).toLocaleDateString("fr-FR")}</td>
                  <td className="py-2">{i.total.toLocaleString("fr-FR")} FCFA</td>
                  <td className="py-2">{i.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <form action={boundUpdate} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="font-semibold text-brand-green-900">Modifier la fiche client</h2>
        <div>
          <label className="text-sm font-medium text-brand-green-900">Nom complet</label>
          <input name="name" required defaultValue={customer.name} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-brand-green-900">Telephone</label>
            <input name="phone" defaultValue={customer.phone ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-brand-green-900">Email</label>
            <input type="email" name="email" defaultValue={customer.email ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-brand-green-900">Adresse</label>
          <textarea name="address" rows={2} defaultValue={customer.address ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <label className="flex items-center gap-2 text-sm text-brand-green-900">
          <input type="checkbox" name="loyal" defaultChecked={customer.loyal} /> Client fidele
        </label>
        <button type="submit" className="rounded-md bg-brand-green-700 px-5 py-2.5 font-semibold text-white hover:bg-brand-green-800">
          Enregistrer
        </button>
      </form>
    </div>
  );
}
