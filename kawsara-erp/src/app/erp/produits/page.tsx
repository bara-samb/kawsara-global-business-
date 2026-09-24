import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/require-permission";

export default async function ProduitsPage() {
  await requirePagePermission("product.read");
  const session = await auth();
  const role = session!.user.role;
  // Le prix d'achat revele la marge : reserve a ceux qui gerent les produits ou voient les benefices.
  const showPurchasePrice = can(role, "product.update") || can(role, "profit.view");

  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      stocks: true,
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-green-900">Produits</h1>
          <p className="text-sm text-gray-500">{products.length} produit(s)</p>
        </div>
        {can(role, "product.create") && (
          <Link
            href="/erp/produits/nouveau"
            className="rounded-md bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-800"
          >
            + Nouveau produit
          </Link>
        )}
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm text-brand-green-900">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Categorie</th>
              {showPurchasePrice && <th className="px-4 py-3">Prix achat</th>}
              <th className="px-4 py-3">Prix vente</th>
              <th className="px-4 py-3">Stock total</th>
              <th className="px-4 py-3">En ligne</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((p) => {
              const totalStock = p.stocks.reduce((s, st) => s + st.quantity, 0);
              const critical = p.stocks.some((s) => s.quantity <= p.minThreshold);
              return (
                <tr key={p.id} className="hover:bg-brand-green-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.reference}</td>
                  <td className="px-4 py-3 font-medium text-brand-green-900">
                    <Link href={`/erp/produits/${p.id}`} className="hover:text-brand-gold-600">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.category?.name ?? "-"}</td>
                  {showPurchasePrice && <td className="px-4 py-3">{p.purchasePrice.toLocaleString("fr-FR")}</td>}
                  <td className="px-4 py-3 font-semibold">{p.sellingPrice.toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-3">
                    <span className={critical ? "font-semibold text-red-600" : ""}>{totalStock}</span>
                    {critical && <span className="ml-1 text-xs text-red-500">(seuil bas)</span>}
                  </td>
                  <td className="px-4 py-3">
                    {p.onlineEnabled ? (
                      <span className="rounded-full bg-brand-green-100 px-2 py-0.5 text-xs font-medium text-brand-green-700">Oui</span>
                    ) : (
                      <span className="text-xs text-gray-400">Non</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.active ? (
                      <span className="rounded-full bg-brand-green-100 px-2 py-0.5 text-xs font-medium text-brand-green-700">Actif</span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Inactif</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={showPurchasePrice ? 8 : 7} className="px-4 py-8 text-center text-gray-400">
                  Aucun produit. Creez le premier produit pour commencer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
