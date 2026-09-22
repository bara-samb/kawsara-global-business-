import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createStaffUser, toggleUserActive } from "@/lib/actions/users";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  GERANT: "Gerant",
  CAISSIER: "Caissier",
  MAGASINIER: "Magasinier",
  COMPTABLE: "Comptable",
  VENDEUR: "Vendeur",
  CLIENT: "Client",
};

export default async function UtilisateursPage({
  searchParams,
}: {
  searchParams: Promise<{ cree?: string }>;
}) {
  const { cree } = await searchParams;
  const session = await auth();
  const role = session!.user.role;
  const canCreate = can(role, "user.create");
  const canUpdate = can(role, "user.update");

  const [users, stores] = await Promise.all([
    prisma.user.findMany({
      where: { role: { not: "CLIENT" } },
      orderBy: { createdAt: "asc" },
      include: { store: true },
    }),
    prisma.store.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="text-xl font-bold text-brand-green-900">Utilisateurs</h1>
      <p className="text-sm text-gray-500">Comptes du personnel (hors clients de la boutique en ligne).</p>

      {cree && (
        <p className="mt-4 rounded-md bg-brand-green-50 px-3 py-2 text-sm text-brand-green-700">
          Compte {cree} cree avec succes.
        </p>
      )}

      {canCreate && (
        <form action={createStaffUser} className="mt-6 grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="text-xs font-medium text-brand-green-900">Nom</label>
            <input name="name" required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-brand-green-900">Email</label>
            <input name="email" type="email" required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-brand-green-900">Mot de passe</label>
            <input name="password" type="password" required minLength={8} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-brand-green-900">Role</label>
            <select name="role" required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="GERANT">Gerant</option>
              <option value="CAISSIER">Caissier</option>
              <option value="MAGASINIER">Magasinier</option>
              <option value="COMPTABLE">Comptable</option>
              <option value="VENDEUR">Vendeur</option>
              <option value="ADMIN">Administrateur</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-brand-green-900">Boutique</label>
            <select name="storeId" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">— Aucune (siege) —</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-5">
            <button className="rounded-md bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-800">
              Creer le compte
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Boutique</th>
              <th className="px-4 py-3">Statut</th>
              {canUpdate && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => {
              const toggle = toggleUserActive.bind(null, u.id, !u.active);
              return (
                <tr key={u.id} className="hover:bg-brand-green-50/50">
                  <td className="px-4 py-3 font-medium text-brand-green-900">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">{ROLE_LABELS[u.role]}</td>
                  <td className="px-4 py-3 text-gray-600">{u.store?.name ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.active ? "bg-brand-green-100 text-brand-green-700" : "bg-red-100 text-red-700"}`}>
                      {u.active ? "Actif" : (u.lockedUntil && u.lockedUntil > new Date() ? "Verrouille" : "Desactive")}
                    </span>
                  </td>
                  {canUpdate && (
                    <td className="px-4 py-3 text-right">
                      <form action={toggle}>
                        <button className="text-xs font-medium text-brand-green-700 hover:underline">
                          {u.active ? "Desactiver" : "Reactiver"}
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr><td colSpan={canUpdate ? 6 : 5} className="px-4 py-8 text-center text-gray-400">Aucun utilisateur.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
