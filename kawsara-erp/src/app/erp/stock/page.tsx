import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { adjustStock } from "@/lib/actions/stores";
import { ActionForm } from "@/components/action-form";
import { requirePagePermission } from "@/lib/require-permission";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ critique?: string }>;
}) {
  await requirePagePermission("stock.read");
  const { critique } = await searchParams;
  const showCriticalOnly = critique === "1";
  const session = await auth();
  const role = session!.user.role;
  const isPrincipalAdmin = session!.user.isPrincipalAdmin;
  const canAdjust = can(role, "stock.adjust", isPrincipalAdmin);

  const stores = await prisma.store.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      stocks: {
        include: { product: true },
        orderBy: { product: { name: "asc" } },
      },
    },
  });

  // Produits proposables pour une premiere mise en stock dans un depot (sinon un nouveau depot
  // reste vide : seul le depot choisi a la creation du produit recoit une ligne de stock).
  const allProducts = canAdjust
    ? await prisma.product.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, reference: true } })
    : [];

  const visibleStores = stores
    .map((store) => ({
      ...store,
      stocks: showCriticalOnly
        ? store.stocks.filter((stock) => stock.quantity <= stock.product.minThreshold)
        : store.stocks,
    }))
    .filter((store) => !showCriticalOnly || store.stocks.length > 0);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-green-900">Depots &amp; stock</h1>
          <p className="text-sm text-gray-500">
            {showCriticalOnly ? "Produits avec stock critique" : `${stores.length} depot(s)`}
          </p>
        </div>
        {can(role, "store.create") && (
          <Link href="/erp/stock/nouveau-depot" className="rounded-md bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-800">
            + Nouveau depot
          </Link>
        )}
      </div>

      {visibleStores.map((store) => (
        <div key={store.id} className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="font-semibold text-brand-green-900">{store.name}</h2>
          <p className="text-xs text-gray-500">{store.reference} — {store.address ?? "Adresse non renseignee"}</p>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="py-1">Produit</th>
                  <th className="py-1">Quantite</th>
                  <th className="py-1">Reserve</th>
                  <th className="py-1">Seuil</th>
                  <th className="py-1">Statut</th>
                  {canAdjust && <th className="py-1">Ajuster</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {store.stocks.map((s) => {
                  const outOfStock = s.quantity <= 0;
                  const low = !outOfStock && s.quantity <= s.product.minThreshold;
                  return (
                    <tr key={s.id}>
                      <td className="py-2">
                        <Link href={`/erp/produits/${s.productId}`} className="text-brand-green-700 hover:underline">
                          {s.product.name}
                        </Link>
                      </td>
                      <td className="py-2 font-medium">{s.quantity}</td>
                      <td className="py-2 text-gray-500">{s.reserved}</td>
                      <td className="py-2 text-gray-500">{s.product.minThreshold}</td>
                      <td className="py-2">
                        {outOfStock ? (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Rupture</span>
                        ) : low ? (
                          <span className="rounded-full bg-brand-gold-50 px-2 py-0.5 text-xs font-semibold text-brand-gold-700">Seuil bas</span>
                        ) : (
                          <span className="rounded-full bg-brand-green-100 px-2 py-0.5 text-xs font-semibold text-brand-green-700">OK</span>
                        )}
                      </td>
                      {canAdjust && (
                        <td className="py-2">
                          <ActionForm
                            action={adjustStock}
                            className="flex items-center gap-1"
                            confirm={{
                              title: "Corriger le stock manuellement ?",
                              message: `Le stock de « ${s.product.name} » dans ${store.name} (actuellement ${s.quantity}) sera remplace par la quantite saisie.`,
                              confirmLabel: "Oui, corriger le stock",
                            }}
                          >
                            <input type="hidden" name="productId" value={s.productId} />
                            <input type="hidden" name="storeId" value={store.id} />
                            <input
                              type="number"
                              name="newQuantity"
                              min={0}
                              required
                              defaultValue={s.quantity}
                              className="w-16 rounded-md border border-gray-300 px-2 py-1 text-xs"
                            />
                            <input
                              type="text"
                              name="reason"
                              placeholder="Motif"
                              required
                              className="w-28 rounded-md border border-gray-300 px-2 py-1 text-xs"
                            />
                            <button type="submit" className="rounded-md bg-brand-green-700 px-2 py-1 text-xs font-semibold text-white hover:bg-brand-green-800">
                              OK
                            </button>
                          </ActionForm>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {store.stocks.length === 0 && (
                  <tr>
                    <td colSpan={canAdjust ? 6 : 5} className="py-4 text-center text-gray-400">Aucun stock enregistre pour ce depot.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {canAdjust && !showCriticalOnly && (() => {
            const stocked = new Set(store.stocks.map((s) => s.productId));
            const missing = allProducts.filter((p) => !stocked.has(p.id));
            if (missing.length === 0) return null;
            return (
              <ActionForm action={adjustStock} className="mt-4 flex flex-wrap items-end gap-2 border-t border-gray-100 pt-4">
                <input type="hidden" name="storeId" value={store.id} />
                <div>
                  <label className="text-xs font-medium text-brand-green-900">Ajouter un produit a ce depot</label>
                  <select name="productId" required className="mt-1 block w-60 rounded-md border border-gray-300 px-2 py-1 text-xs">
                    <option value="">— Choisir un produit —</option>
                    {missing.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.reference})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-brand-green-900">Quantite</label>
                  <input type="number" name="newQuantity" min={0} required defaultValue={0} className="mt-1 block w-20 rounded-md border border-gray-300 px-2 py-1 text-xs" />
                </div>
                <input type="hidden" name="reason" value="Mise en stock initiale dans ce depot" />
                <button type="submit" className="rounded-md bg-brand-green-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-green-800">
                  Ajouter
                </button>
              </ActionForm>
            );
          })()}
        </div>
      ))}

      {visibleStores.length === 0 && (
        <p className="text-sm text-gray-400">
          {showCriticalOnly ? "Aucun stock critique." : "Aucun depot enregistre."}
        </p>
      )}
    </div>
  );
}
