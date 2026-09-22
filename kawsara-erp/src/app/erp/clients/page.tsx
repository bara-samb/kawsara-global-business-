import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  const role = session!.user.role;
  const { q } = await searchParams;

  const customers = await prisma.customer.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { reference: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      debts: { where: { status: { in: ["NON_PAYEE", "PARTIELLEMENT_PAYEE", "EN_RETARD"] } } },
      _count: { select: { invoices: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-green-900">Clients</h1>
          <p className="text-sm text-gray-500">{customers.length} client(s)</p>
        </div>
        {can(role, "customer.create") && (
          <Link href="/erp/clients/nouveau" className="rounded-md bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-800">
            + Nouveau client
          </Link>
        )}
      </div>

      <form method="get" className="mt-4 flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Rechercher par reference ou par nom..."
          className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md border border-brand-green-700 px-4 py-2 text-sm font-semibold text-brand-green-700 hover:bg-brand-green-50">
          Rechercher
        </button>
        {q && (
          <Link href="/erp/clients" className="rounded-md px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700">
            Reinitialiser
          </Link>
        )}
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Factures</th>
              <th className="px-4 py-3">Solde du</th>
              <th className="px-4 py-3">Fidele</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {customers.map((c) => {
              const due = c.debts.reduce((s, d) => s + d.remainingAmount, 0);
              return (
                <tr key={c.id} className="hover:bg-brand-green-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.reference}</td>
                  <td className="px-4 py-3 font-medium text-brand-green-900">
                    <Link href={`/erp/clients/${c.id}`} className="hover:text-brand-gold-600">{c.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.phone ?? c.email ?? "-"}</td>
                  <td className="px-4 py-3">{c._count.invoices}</td>
                  <td className="px-4 py-3">
                    {due > 0 ? (
                      <span className="font-semibold text-red-600">{due.toLocaleString("fr-FR")} FCFA</span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{c.loyal ? "Oui" : "-"}</td>
                </tr>
              );
            })}
            {customers.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucun client.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
