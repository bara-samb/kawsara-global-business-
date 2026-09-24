import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/require-permission";

const STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente",
  TRANSFORME: "Transforme en facture",
  ANNULE: "Annule",
};

export default async function DebitsPage() {
  await requirePagePermission("debit.read");
  const session = await auth();
  const role = session!.user.role;

  const debits = await prisma.debit.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { customer: true, store: true, items: true, invoice: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-green-900">Debits</h1>
          <p className="text-sm text-gray-500">{debits.length} debit(s)</p>
        </div>
        {can(role, "debit.create") && (
          <Link href="/erp/debits/nouveau" className="rounded-md bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-800">
            + Nouveau debit
          </Link>
        )}
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Depot</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {debits.map((d) => {
              const total = d.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
              return (
                <tr key={d.id} className="hover:bg-brand-green-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    <Link href={`/erp/debits/${d.id}`} className="hover:text-brand-gold-600">{d.reference}</Link>
                  </td>
                  <td className="px-4 py-3">{new Date(d.createdAt).toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-3">{d.customer.name}</td>
                  <td className="px-4 py-3">{d.store.name}</td>
                  <td className="px-4 py-3 font-semibold">{total.toLocaleString("fr-FR")} FCFA</td>
                  <td className="px-4 py-3">
                    <span className={
                      d.status === "TRANSFORME"
                        ? "rounded-full bg-brand-green-100 px-2 py-0.5 text-xs font-medium text-brand-green-700"
                        : d.status === "ANNULE"
                        ? "rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500"
                        : "rounded-full bg-brand-gold-50 px-2 py-0.5 text-xs font-medium text-brand-gold-700"
                    }>
                      {STATUS_LABELS[d.status]}
                    </span>
                  </td>
                </tr>
              );
            })}
            {debits.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucun debit.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
