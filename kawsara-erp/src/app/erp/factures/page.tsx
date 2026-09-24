import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/require-permission";

const ORIGIN_LABELS: Record<string, string> = {
  VENTE: "Vente comptant",
  DEBIT: "Debit transforme",
  ECOMMERCE: "Commande en ligne",
};

const STATUS_STYLES: Record<string, string> = {
  PAYEE: "bg-brand-green-100 text-brand-green-700",
  VALIDEE: "bg-brand-green-100 text-brand-green-700",
  PARTIELLEMENT_PAYEE: "bg-brand-gold-50 text-brand-gold-700",
  IMPAYEE: "bg-red-100 text-red-700",
  BROUILLON: "bg-gray-100 text-gray-500",
  ANNULEE: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  PAYEE: "Payee",
  VALIDEE: "Validee",
  PARTIELLEMENT_PAYEE: "Partiellement payee",
  IMPAYEE: "Impayee",
  BROUILLON: "Brouillon",
  ANNULEE: "Annulee",
};

export default async function FacturesPage({
  searchParams,
}: {
  searchParams: Promise<{ recherche?: string }>;
}) {
  await requirePagePermission("invoice.read");
  const { recherche } = await searchParams;
  const query = recherche?.trim() ?? "";
  const invoices = await prisma.invoice.findMany({
    where: query
      ? {
          OR: [
            { reference: { contains: query } },
            { customerName: { contains: query } },
            { customerPhone: { contains: query } },
            { customer: { name: { contains: query } } },
            { customer: { phone: { contains: query } } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 150,
    include: { customer: true, store: true },
  });

  return (
    <div>
      <div>
        <h1 className="text-xl font-bold text-brand-green-900">Factures</h1>
        <p className="text-sm text-gray-500">{invoices.length} facture(s){query ? ` trouvée(s) pour « ${query} »` : ""}</p>
      </div>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-2">
        <div className="min-w-[260px] flex-1">
          <label htmlFor="invoice-search" className="text-sm font-medium text-brand-green-900">Rechercher une facture</label>
          <input
            id="invoice-search"
            name="recherche"
            defaultValue={query}
            placeholder="Référence, nom ou téléphone du client"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button type="submit" className="rounded-md bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-800">
          Rechercher
        </button>
        {query && (
          <Link href="/erp/factures" className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Effacer
          </Link>
        )}
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Origine</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Reste</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-brand-green-50/50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  <Link href={`/erp/factures/${inv.id}`} className="hover:text-brand-gold-600">{inv.reference}</Link>
                </td>
                <td className="px-4 py-3">{new Date(inv.createdAt).toLocaleString("fr-FR")}</td>
                <td className="px-4 py-3 text-gray-600">{ORIGIN_LABELS[inv.origin]}</td>
                <td className="px-4 py-3">{inv.customer?.name ?? inv.customerName ?? "Client de passage"}</td>
                <td className="px-4 py-3 font-semibold">{inv.total.toLocaleString("fr-FR")} FCFA</td>
                <td className="px-4 py-3">
                  {inv.remainingAmount > 0 ? (
                    <span className="font-semibold text-red-600">{inv.remainingAmount.toLocaleString("fr-FR")}</span>
                  ) : (
                    <span className="text-gray-400">0</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[inv.status]}`}>
                    {STATUS_LABELS[inv.status]}
                  </span>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucune facture.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
