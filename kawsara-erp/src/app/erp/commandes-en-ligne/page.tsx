import Link from "next/link";
import { prisma } from "@/lib/prisma";

const STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente",
  CONFIRMEE: "Confirmee",
  EN_PREPARATION: "En preparation",
  LIVREE: "Livree",
  ANNULEE: "Annulee",
};

const ORDER_STATUSES = ["EN_ATTENTE", "CONFIRMEE", "EN_PREPARATION", "LIVREE", "ANNULEE"] as const;

const STATUS_STYLES: Record<string, string> = {
  EN_ATTENTE: "bg-brand-gold-50 text-brand-gold-700",
  CONFIRMEE: "bg-brand-green-100 text-brand-green-700",
  EN_PREPARATION: "bg-brand-green-100 text-brand-green-700",
  LIVREE: "bg-brand-green-100 text-brand-green-700",
  ANNULEE: "bg-red-100 text-red-700",
};

export default async function CommandesEnLignePage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const { statut: statutParam } = await searchParams;
  const statut = ORDER_STATUSES.find((s) => s === statutParam);

  const orders = await prisma.ecommerceOrder.findMany({
    where: statut ? { status: statut } : {},
    orderBy: { createdAt: "desc" },
    include: { customer: true, store: true, items: true },
    take: 200,
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand-green-900">Commandes en ligne</h1>
          <p className="text-sm text-gray-500">{orders.length} commande(s)</p>
        </div>
        <form className="flex items-center gap-2" action="/erp/commandes-en-ligne">
          <select name="statut" defaultValue={statut ?? ""} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">
            <option value="">Tous statuts</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="CONFIRMEE">Confirmee</option>
            <option value="EN_PREPARATION">En preparation</option>
            <option value="LIVREE">Livree</option>
            <option value="ANNULEE">Annulee</option>
          </select>
          <button className="rounded-md bg-brand-green-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-green-800">
            Filtrer
          </button>
        </form>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Depot</th>
              <th className="px-4 py-3">Articles</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-brand-green-50/50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  <Link href={`/erp/commandes-en-ligne/${o.id}`} className="hover:text-brand-gold-600">
                    {o.reference}
                  </Link>
                </td>
                <td className="px-4 py-3">{o.createdAt.toLocaleString("fr-FR")}</td>
                <td className="px-4 py-3">{o.customer.name}</td>
                <td className="px-4 py-3 text-gray-600">{o.store?.name ?? "A assigner"}</td>
                <td className="px-4 py-3">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                <td className="px-4 py-3 font-semibold">{o.total.toLocaleString("fr-FR")} FCFA</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[o.status]}`}>
                    {STATUS_LABELS[o.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/erp/commandes-en-ligne/${o.id}`}
                    className="whitespace-nowrap rounded-md bg-brand-green-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-green-800"
                  >
                    Voir / traiter
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Aucune commande.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
