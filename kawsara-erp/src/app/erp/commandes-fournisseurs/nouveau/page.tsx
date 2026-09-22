import { prisma } from "@/lib/prisma";
import { createSupplierOrder } from "@/lib/actions/supplier-orders";
import { LineItemsEditor } from "@/components/erp/line-items-editor";

export default async function NouvelleCommandeFournisseurPage() {
  const [stores, suppliers, products] = await Promise.all([
    prisma.store.findMany({ orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const lineItemProducts = products.map((p) => ({
    id: p.id,
    reference: p.reference,
    name: p.name,
    price: p.purchasePrice,
  }));

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-brand-green-900">Nouvelle commande fournisseur</h1>
      <form action={createSupplierOrder} className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-brand-green-900">Fournisseur</label>
            <select name="supplierId" required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">— Choisir un fournisseur —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-brand-green-900">Depot de reception</label>
            <select name="storeId" required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <LineItemsEditor products={lineItemProducts} priceLabel="Prix d'achat" />

        <button type="submit" className="rounded-md bg-brand-green-700 px-5 py-2.5 font-semibold text-white hover:bg-brand-green-800">
          Creer la commande
        </button>
      </form>
    </div>
  );
}
