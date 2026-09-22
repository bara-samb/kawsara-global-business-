import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";

export default async function VentesPage() {
  const session = await auth();
  const role = session!.user.role;

  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { customer: true, seller: true, store: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-green-900">Ventes</h1>
          <p className="text-sm text-gray-500">{sales.length} vente(s)</p>
        </div>
        {can(role, "sale.create") && (
          <Link href="/erp/ventes/nouveau" className="rounded-md bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-800">
            + Nouvelle vente
          </Link>
        )}
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Vendeur</th>
              <th className="px-4 py-3">Depot</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sales.map((s) => (
              <tr key={s.id} className="hover:bg-brand-green-50/50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  <Link href={`/erp/ventes/${s.id}`} className="hover:text-brand-gold-600">{s.reference}</Link>
                </td>
                <td className="px-4 py-3">{new Date(s.createdAt).toLocaleString("fr-FR")}</td>
                <td className="px-4 py-3">{s.customer?.name ?? "Client de passage"}</td>
                <td className="px-4 py-3">{s.seller.name}</td>
                <td className="px-4 py-3">{s.store.name}</td>
                <td className="px-4 py-3 font-semibold">{s.total.toLocaleString("fr-FR")} FCFA</td>
                <td className="px-4 py-3">
                  {s.status === "VALIDEE" ? (
                    <span className="rounded-full bg-brand-green-100 px-2 py-0.5 text-xs font-medium text-brand-green-700">Validee</span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Annulee</span>
                  )}
                </td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucune vente.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
