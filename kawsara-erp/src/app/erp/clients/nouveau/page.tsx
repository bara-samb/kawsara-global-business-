import { createCustomer } from "@/lib/actions/customers";

export default function NouveauClientPage() {
  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-brand-green-900">Nouveau client</h1>
      <form action={createCustomer} className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <div>
          <label className="text-sm font-medium text-brand-green-900">Nom complet</label>
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
        <label className="flex items-center gap-2 text-sm text-brand-green-900">
          <input type="checkbox" name="loyal" /> Client fidele
        </label>
        <button type="submit" className="rounded-md bg-brand-green-700 px-5 py-2.5 font-semibold text-white hover:bg-brand-green-800">
          Creer le client
        </button>
      </form>
    </div>
  );
}
