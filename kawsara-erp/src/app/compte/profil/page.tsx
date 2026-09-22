import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateOwnProfile } from "@/lib/actions/account";

export default async function ProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ enregistre?: string }>;
}) {
  const { enregistre } = await searchParams;
  const session = await auth();
  const customer = session?.user.customerId
    ? await prisma.customer.findUnique({ where: { id: session.user.customerId } })
    : null;

  if (!customer) {
    return (
      <p className="rounded-xl border border-dashed border-brand-green-200 bg-white p-8 text-center text-sm text-gray-500">
        Aucun profil client associe a ce compte.
      </p>
    );
  }

  return (
    <div className="max-w-lg">
      {enregistre && (
        <p className="mb-4 rounded-md bg-brand-green-100 px-4 py-2 text-sm font-semibold text-brand-green-800">
          Profil mis a jour avec succes.
        </p>
      )}

      <form action={updateOwnProfile} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <div>
          <label className="text-sm font-medium text-brand-green-900">Nom complet</label>
          <input name="name" required defaultValue={customer.name} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-green-900">Email</label>
          <input value={session?.user.email ?? ""} disabled className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500" />
          <p className="mt-1 text-xs text-gray-400">L&apos;email ne peut pas etre modifie ici.</p>
        </div>
        <div>
          <label className="text-sm font-medium text-brand-green-900">Telephone</label>
          <input name="phone" defaultValue={customer.phone ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-green-900">Adresse</label>
          <input name="address" defaultValue={customer.address ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded-md bg-brand-green-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-green-800">
          Enregistrer
        </button>
      </form>
    </div>
  );
}
