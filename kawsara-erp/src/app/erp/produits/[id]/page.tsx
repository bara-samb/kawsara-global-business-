import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateProduct, toggleProductActive } from "@/lib/actions/products";

export default async function ProduitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, categories, suppliers] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { stocks: { include: { store: true } } },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!product) notFound();

  const boundUpdate = updateProduct.bind(null, product.id);
  const activate = toggleProductActive.bind(null, product.id, true);
  const deactivate = toggleProductActive.bind(null, product.id, false);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-green-900">{product.name}</h1>
          <p className="font-mono text-xs text-gray-500">{product.reference}</p>
        </div>
        <form action={product.active ? deactivate : activate}>
          <button
            type="submit"
            className={
              product.active
                ? "rounded-md border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                : "rounded-md border border-brand-green-300 px-3 py-1.5 text-sm font-semibold text-brand-green-700 hover:bg-brand-green-50"
            }
          >
            {product.active ? "Desactiver" : "Activer"}
          </button>
        </form>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm font-semibold text-brand-green-900">Stock par boutique</p>
        <ul className="mt-2 divide-y divide-gray-100 text-sm">
          {product.stocks.map((s) => (
            <li key={s.id} className="flex justify-between py-2">
              <span>{s.store.name}</span>
              <span className={s.quantity <= product.minThreshold ? "font-semibold text-red-600" : ""}>
                {s.quantity} en stock ({s.reserved} reserve)
              </span>
            </li>
          ))}
          {product.stocks.length === 0 && <li className="py-2 text-gray-400">Aucun stock enregistre</li>}
        </ul>
      </div>

      <form action={boundUpdate} className="mt-4 space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <div>
          <label className="text-sm font-medium text-brand-green-900">Nom du produit</label>
          <input name="name" required defaultValue={product.name} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="text-sm font-medium text-brand-green-900">Description</label>
          <textarea name="description" rows={3} defaultValue={product.description ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-brand-green-900">Categorie</label>
            <select name="categoryId" defaultValue={product.categoryId ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">— Aucune —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-brand-green-900">Fournisseur principal</label>
            <select name="supplierId" defaultValue={product.supplierId ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">— Aucun —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-brand-green-900">Prix d&apos;achat (FCFA)</label>
            <input type="number" name="purchasePrice" min={0} required defaultValue={product.purchasePrice} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-brand-green-900">Prix de vente (FCFA)</label>
            <input type="number" name="sellingPrice" min={0} required defaultValue={product.sellingPrice} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-brand-green-900">Seuil minimum</label>
            <input type="number" name="minThreshold" min={0} defaultValue={product.minThreshold} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-brand-green-900">
            <input type="checkbox" name="active" defaultChecked={product.active} /> Actif
          </label>
          <label className="flex items-center gap-2 text-sm text-brand-green-900">
            <input type="checkbox" name="onlineEnabled" defaultChecked={product.onlineEnabled} /> Vente en ligne
          </label>
        </div>

        <button type="submit" className="rounded-md bg-brand-green-700 px-5 py-2.5 font-semibold text-white hover:bg-brand-green-800">
          Enregistrer
        </button>
      </form>
    </div>
  );
}
