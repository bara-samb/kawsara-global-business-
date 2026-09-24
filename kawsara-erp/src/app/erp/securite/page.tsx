import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/require-permission";

const EVENT_LABELS: Record<string, string> = {
  LOGIN_FAILED: "Connexion echouee",
  LOGIN_BLOCKED: "Connexion bloquee (compte verrouille)",
};

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Connexion",
  LOGOUT: "Deconnexion",
  REGISTER: "Inscription",
  CREATE: "Creation",
  UPDATE: "Modification",
  DELETE: "Suppression",
  CANCEL: "Annulation",
  ACTIVATE: "Activation",
  DEACTIVATE: "Desactivation",
  STOCK_ADJUST: "Ajustement de stock",
  CREATE_BELOW_COST: "Vente a perte (autorisee)",
  EXPORT: "Export",
  ACCESS_DENIED: "Acces refuse",
  SET_PRINCIPAL_ADMIN: "Designation admin principal",
};

export default async function SecuritePage({
  searchParams,
}: {
  searchParams: Promise<{ utilisateur?: string }>;
}) {
  await requirePagePermission("security.view");
  const { utilisateur } = await searchParams;
  const [securityEvents, auditLogs, lockedUsers, staff] = await Promise.all([
    prisma.securityEvent.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.auditLog.findMany({
      where: utilisateur ? { userId: utilisateur } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: true },
    }),
    prisma.user.findMany({ where: { lockedUntil: { gt: new Date() } } }),
    prisma.user.findMany({ where: { role: { not: "CLIENT" } }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="text-xl font-bold text-brand-green-900">Centre de securite</h1>
      <p className="text-sm text-gray-500">
        Tentatives de connexion, journal d&apos;audit et comptes verrouilles.
      </p>
      <Link href="/erp/securite/2fa" className="mt-2 inline-block text-sm font-semibold text-brand-green-700 hover:text-brand-gold-600">
        Configurer la double authentification (2FA) de mon compte →
      </Link>

      {lockedUsers.length > 0 && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">
            {lockedUsers.length} compte(s) actuellement verrouille(s) (20 echecs de connexion : attaque probable)
          </p>
          <ul className="mt-2 space-y-1 text-sm text-red-700">
            {lockedUsers.map((u) => (
              <li key={u.id}>
                {u.name} ({u.email}) — verrouille jusqu&apos;a {u.lockedUntil?.toLocaleString("fr-FR")}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-brand-green-900">Evenements de securite recents</p>
          <div className="mt-3 max-h-[28rem] overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="py-1.5 pr-2">Date</th>
                  <th className="py-1.5 pr-2">Type</th>
                  <th className="py-1.5 pr-2">Email</th>
                  <th className="py-1.5">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {securityEvents.map((e) => (
                  <tr key={e.id}>
                    <td className="py-1.5 pr-2 whitespace-nowrap text-gray-500">{e.createdAt.toLocaleString("fr-FR")}</td>
                    <td className="py-1.5 pr-2 font-medium text-red-600">{EVENT_LABELS[e.type] ?? e.type}</td>
                    <td className="py-1.5 pr-2 text-gray-600">{e.email ?? "-"}</td>
                    <td className="py-1.5 text-gray-500">{e.detail ?? "-"}</td>
                  </tr>
                ))}
                {securityEvents.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-gray-400">Aucun evenement.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-brand-green-900">Journal d&apos;audit (qui a fait quoi)</p>
            <form className="flex items-center gap-2">
              <select name="utilisateur" defaultValue={utilisateur ?? ""} className="rounded-md border border-gray-300 px-2 py-1 text-xs">
                <option value="">Tous les utilisateurs</option>
                {staff.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <button className="rounded-md bg-brand-green-700 px-2 py-1 text-xs font-semibold text-white hover:bg-brand-green-800">
                Filtrer
              </button>
            </form>
          </div>
          <div className="mt-3 max-h-[28rem] overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="py-1.5 pr-2">Date</th>
                  <th className="py-1.5 pr-2">Utilisateur</th>
                  <th className="py-1.5 pr-2">Action</th>
                  <th className="py-1.5 pr-2">Entite</th>
                  <th className="py-1.5">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-1.5 pr-2 whitespace-nowrap text-gray-500">{log.createdAt.toLocaleString("fr-FR")}</td>
                    <td className="py-1.5 pr-2 text-gray-600">
                      {log.user ? `${log.user.name} (${log.user.reference})` : "-"}
                    </td>
                    <td className={`py-1.5 pr-2 font-medium ${log.action === "ACCESS_DENIED" ? "text-red-600" : "text-brand-green-800"}`}>
                      {ACTION_LABELS[log.action] ?? log.action}
                    </td>
                    <td className="py-1.5 pr-2 text-gray-500">{log.entity}</td>
                    <td className="py-1.5 break-all text-xs text-gray-400">{log.metadata ?? log.entityId ?? "-"}</td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-gray-400">Aucune entree.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
