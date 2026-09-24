import { createSupplier } from "@/lib/actions/suppliers";
import { ActionForm } from "@/components/action-form";
import { requirePagePermission } from "@/lib/require-permission";

export default async function NouveauFournisseurPage() {
  await requirePagePermission("supplier.create");
  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-brand-green-900">Nouveau fournisseur</h1>
      <ActionForm action={createSupplier} className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <div>
          <label className="text-sm font-medium text-brand-green-900">Nom</label>
          <input name="name" required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-green-900">Telephone</label>
          <input name="phone" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-green-900">Email</label>
          <input type="email" name="email" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-green-900">Adresse</label>
          <textarea name="address" rows={2} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded-md bg-brand-green-700 px-5 py-2.5 font-semibold text-white hover:bg-brand-green-800">
          Creer le fournisseur
        </button>
      </ActionForm>
    </div>
  );
}
