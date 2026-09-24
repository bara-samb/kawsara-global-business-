import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/require-permission";

export default async function FournisseursPage() {
  await requirePagePermission("supplier.read");
  const session = await auth();
  const role = session!.user.role;

  const suppliers = await prisma.supplier.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { products: true, orders: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-green-900">Fournisseurs</h1>
          <p className="text-sm text-gray-500">{suppliers.length} fournisseur(s)</p>
        </div>
        {can(role, "supplier.create") && (
          <Link href="/erp/fournisseurs/nouveau" className="rounded-md bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-800">
            + Nouveau fournisseur
          </Link>
        )}
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Produits</th>
              <th className="px-4 py-3">Commandes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {suppliers.map((s) => (
              <tr key={s.id} className="hover:bg-brand-green-50/50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.reference}</td>
                <td className="px-4 py-3 font-medium text-brand-green-900">
                  <Link href={`/erp/fournisseurs/${s.id}`} className="hover:text-brand-gold-600">{s.name}</Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{s.phone ?? s.email ?? "-"}</td>
                <td className="px-4 py-3">{s._count.products}</td>
                <td className="px-4 py-3">{s._count.orders}</td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Aucun fournisseur.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
