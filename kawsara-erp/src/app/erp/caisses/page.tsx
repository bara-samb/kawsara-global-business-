import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { openCashSession, closeCashSession } from "@/lib/actions/cash";

export default async function CaissesPage() {
  const session = await auth();
  const role = session!.user.role;

  const registers = await prisma.cashRegister.findMany({
    orderBy: { number: "asc" },
    include: {
      store: true,
      sessions: {
        orderBy: { openedAt: "desc" },
        take: 5,
        include: { user: true },
      },
    },
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand-green-900">Caisses</h1>
        <p className="text-sm text-gray-500">{registers.length} caisse(s)</p>
      </div>

      {registers.map((reg) => {
        const openSession = reg.sessions.find((s) => s.status === "OUVERTE");
        return (
          <div key={reg.id} className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-brand-green-900">{reg.name}</h2>
                <p className="text-xs text-gray-500">{reg.store.name} — {reg.reference}</p>
              </div>
              {openSession ? (
                <span className="rounded-full bg-brand-green-100 px-3 py-1 text-xs font-semibold text-brand-green-700">
                  Ouverte depuis {new Date(openSession.openedAt).toLocaleString("fr-FR")}
                </span>
              ) : (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">Fermee</span>
              )}
            </div>

            {openSession ? (
              can(role, "cash.close") && (
                <form action={closeCashSession.bind(null, openSession.id)} className="mt-4 flex items-end gap-3">
                  <div>
                    <label className="text-sm font-medium text-brand-green-900">Solde declare a la fermeture (FCFA)</label>
                    <input
                      type="number"
                      name="closingBalanceDeclared"
                      min={0}
                      required
                      defaultValue={openSession.openingBalance}
                      className="mt-1 w-56 rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <button type="submit" className="rounded-md bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-800">
                    Fermer la caisse
                  </button>
                </form>
              )
            ) : (
              can(role, "cash.open") && (
                <form action={openCashSession} className="mt-4 flex items-end gap-3">
                  <input type="hidden" name="cashRegisterId" value={reg.id} />
                  <div>
                    <label className="text-sm font-medium text-brand-green-900">Solde d&apos;ouverture (FCFA)</label>
                    <input
                      type="number"
                      name="openingBalance"
                      min={0}
                      required
                      defaultValue={0}
                      className="mt-1 w-56 rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <button type="submit" className="rounded-md bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-800">
                    Ouvrir la caisse
                  </button>
                </form>
              )
            )}

            {reg.sessions.length > 0 && (
              <table className="mt-4 min-w-full text-sm">
                <thead className="text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="py-1">Ouverte par</th>
                    <th className="py-1">Ouverture</th>
                    <th className="py-1">Fermeture</th>
                    <th className="py-1">Solde ouv.</th>
                    <th className="py-1">Solde declare</th>
                    <th className="py-1">Solde theorique</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reg.sessions.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2">{s.user.name}</td>
                      <td className="py-2">{new Date(s.openedAt).toLocaleString("fr-FR")}</td>
                      <td className="py-2">{s.closedAt ? new Date(s.closedAt).toLocaleString("fr-FR") : "-"}</td>
                      <td className="py-2">{s.openingBalance.toLocaleString("fr-FR")}</td>
                      <td className="py-2">{s.closingBalanceDeclared?.toLocaleString("fr-FR") ?? "-"}</td>
                      <td className="py-2">{s.closingBalanceTheoretical?.toLocaleString("fr-FR") ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}

      {registers.length === 0 && (
        <p className="text-sm text-gray-400">Aucune caisse enregistree.</p>
      )}
    </div>
  );
}
