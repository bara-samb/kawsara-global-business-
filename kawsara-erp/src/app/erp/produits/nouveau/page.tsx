import { prisma } from "@/lib/prisma";
import { createProduct } from "@/lib/actions/products";

export default async function NouveauProduitPage() {
  const [categories, suppliers, stores] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.store.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-brand-green-900">Nouveau produit</h1>

      <form action={createProduct} className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <div>
          <label className="text-sm font-medium text-brand-green-900">Nom du produit</label>
          <input name="name" required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="text-sm font-medium text-brand-green-900">Description</label>
          <textarea name="description" rows={3} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-brand-green-900">Categorie</label>
            <select name="categoryId" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">— Aucune —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-brand-green-900">Fournisseur principal</label>
            <select name="supplierId" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
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
            <input type="number" name="purchasePrice" min={0} required defaultValue={0} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-brand-green-900">Prix de vente (FCFA)</label>
            <input type="number" name="sellingPrice" min={0} required defaultValue={0} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-brand-green-900">Seuil minimum</label>
            <input type="number" name="minThreshold" min={0} defaultValue={5} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-brand-green-900">Boutique</label>
            <select name="storeId" required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-brand-green-900">Stock initial</label>
            <input type="number" name="initialStock" min={0} defaultValue={0} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-brand-green-900">
            <input type="checkbox" name="active" defaultChecked /> Actif
          </label>
          <label className="flex items-center gap-2 text-sm text-brand-green-900">
            <input type="checkbox" name="onlineEnabled" /> Vente en ligne (visible sur la boutique)
          </label>
        </div>

        <button type="submit" className="rounded-md bg-brand-green-700 px-5 py-2.5 font-semibold text-white hover:bg-brand-green-800">
          Creer le produit
        </button>
      </form>
    </div>
  );
}
