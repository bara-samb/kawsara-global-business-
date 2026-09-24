import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/require-permission";

const STATUS_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  ENVOYEE: "Envoyee",
  PARTIELLEMENT_RECUE: "Partiellement recue",
  RECUE: "Recue",
  ANNULEE: "Annulee",
};

export default async function CommandesFournisseursPage() {
  await requirePagePermission("supplierOrder.read");
  const session = await auth();
  const role = session!.user.role;

  const orders = await prisma.supplierOrder.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { supplier: true, store: true, items: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-green-900">Commandes fournisseurs</h1>
          <p className="text-sm text-gray-500">{orders.length} commande(s)</p>
        </div>
        {can(role, "supplierOrder.create") && (
          <Link href="/erp/commandes-fournisseurs/nouveau" className="rounded-md bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-800">
            + Nouvelle commande
          </Link>
        )}
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Fournisseur</th>
              <th className="px-4 py-3">Depot</th>
              <th className="px-4 py-3">Montant</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((o) => {
              const total = o.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
              return (
                <tr key={o.id} className="hover:bg-brand-green-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    <Link href={`/erp/commandes-fournisseurs/${o.id}`} className="hover:text-brand-gold-600">{o.reference}</Link>
                  </td>
                  <td className="px-4 py-3">{new Date(o.createdAt).toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-3">{o.supplier.name}</td>
                  <td className="px-4 py-3">{o.store.name}</td>
                  <td className="px-4 py-3 font-semibold">{total.toLocaleString("fr-FR")} FCFA</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-brand-gold-50 px-2 py-0.5 text-xs font-medium text-brand-gold-700">
                      {STATUS_LABELS[o.status]}
                    </span>
                  </td>
                </tr>
              );
            })}
            {orders.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucune commande.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
