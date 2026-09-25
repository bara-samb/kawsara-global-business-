import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { updateSupplier } from "@/lib/actions/suppliers";

const ORDER_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  ENVOYEE: "Envoyee",
  PARTIELLEMENT_RECUE: "Partiellement recue",
  RECUE: "Recue",
  ANNULEE: "Annulee",
};

export default async function FournisseurDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const canEdit = can(session!.user.role, "supplier.update");

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      products: { orderBy: { createdAt: "desc" }, take: 20 },
      orders: { orderBy: { createdAt: "desc" }, take: 20 },
      _count: { select: { products: true, orders: true } },
    },
  });
  if (!supplier) notFound();

  const boundUpdate = updateSupplier.bind(null, supplier.id);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand-green-900">{supplier.name}</h1>
        <p className="font-mono text-xs text-gray-500">{supplier.reference}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase text-gray-500">Produits fournis</p>
          <p className="mt-1 text-lg font-bold text-brand-green-900">{supplier._count.products}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase text-gray-500">Commandes fournisseur</p>
          <p className="mt-1 text-lg font-bold text-brand-green-900">{supplier._count.orders}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="font-semibold text-brand-green-900">Commandes fournisseur</h2>
        {supplier.orders.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">Aucune commande enregistree.</p>
        ) : (
          <table className="mt-3 min-w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="py-1">Reference</th>
                <th className="py-1">Date</th>
                <th className="py-1">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {supplier.orders.map((o) => (
                <tr key={o.id}>
                  <td className="py-2">
                    <Link href={`/erp/commandes-fournisseurs/${o.id}`} className="text-brand-green-700 hover:underline">{o.reference}</Link>
                  </td>
                  <td className="py-2">{new Date(o.createdAt).toLocaleDateString("fr-FR")}</td>
                  <td className="py-2">{ORDER_LABELS[o.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="font-semibold text-brand-green-900">Produits fournis</h2>
        {supplier.products.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">Aucun produit lie a ce fournisseur.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100 text-sm">
            {supplier.products.map((p) => (
              <li key={p.id} className="py-2">
                <Link href={`/erp/produits/${p.id}`} className="text-brand-green-700 hover:underline">{p.name}</Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canEdit && (
      <form action={boundUpdate} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="font-semibold text-brand-green-900">Modifier la fiche fournisseur</h2>
        <div>
          <label className="text-sm font-medium text-brand-green-900">Nom</label>
          <input name="name" required defaultValue={supplier.name} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-brand-green-900">Telephone</label>
            <input name="phone" defaultValue={supplier.phone ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-brand-green-900">Email</label>
            <input type="email" name="email" defaultValue={supplier.email ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-brand-green-900">Adresse</label>
          <textarea name="address" rows={2} defaultValue={supplier.address ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded-md bg-brand-green-700 px-5 py-2.5 font-semibold text-white hover:bg-brand-green-800">
          Enregistrer
        </button>
      </form>
      )}
    </div>
  );
}
