import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getPaymentOptions } from "@/lib/payment-options";
import { settleDebt } from "@/lib/actions/debts";
import { ActionForm } from "@/components/action-form";
import { requirePagePermission } from "@/lib/require-permission";

const STATUS_STYLES: Record<string, string> = {
  PAYEE: "bg-brand-green-100 text-brand-green-700",
  PARTIELLEMENT_PAYEE: "bg-brand-gold-50 text-brand-gold-700",
  NON_PAYEE: "bg-red-100 text-red-700",
  EN_RETARD: "bg-red-100 text-red-700",
  ANNULEE: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  PAYEE: "Payee",
  PARTIELLEMENT_PAYEE: "Partiellement payee",
  NON_PAYEE: "Non payee",
  EN_RETARD: "En retard",
  ANNULEE: "Annulee",
};

export default async function DettesPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  await requirePagePermission("debt.read");
  const { statut } = await searchParams;
  const session = await auth();
  const role = session!.user.role;
  const canSettle = can(role, "debt.settle");

  const [debts, paymentOptions] = await Promise.all([
    prisma.customerDebt.findMany({
      where: statut ? { status: statut as "NON_PAYEE" | "PARTIELLEMENT_PAYEE" | "PAYEE" | "EN_RETARD" | "ANNULEE" } : {},
      orderBy: { createdAt: "desc" },
      include: { customer: true, invoice: true },
      take: 200,
    }),
    getPaymentOptions(prisma),
  ]);

  const totalRemaining = debts.reduce((s, d) => s + d.remainingAmount, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand-green-900">Dettes clients</h1>
          <p className="text-sm text-gray-500">
            {debts.length} dette(s) — encours total : {totalRemaining.toLocaleString("fr-FR")} FCFA
          </p>
        </div>
        <form className="flex items-center gap-2" action="/erp/dettes">
          <select name="statut" defaultValue={statut ?? ""} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">
            <option value="">Tous statuts</option>
            <option value="NON_PAYEE">Non payee</option>
            <option value="PARTIELLEMENT_PAYEE">Partiellement payee</option>
            <option value="EN_RETARD">En retard</option>
            <option value="PAYEE">Payee</option>
          </select>
          <button className="rounded-md bg-brand-green-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-green-800">
            Filtrer
          </button>
        </form>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Facture</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Reste</th>
              <th className="px-4 py-3">Statut</th>
              {canSettle && <th className="px-4 py-3">Reglement</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {debts.map((debt) => {
              const settle = settleDebt.bind(null, debt.id);
              return (
                <tr key={debt.id} className="hover:bg-brand-green-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{debt.reference}</td>
                  <td className="px-4 py-3">{debt.customer.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{debt.invoice.reference}</td>
                  <td className="px-4 py-3 font-semibold">{debt.totalAmount.toLocaleString("fr-FR")} FCFA</td>
                  <td className="px-4 py-3 font-semibold text-red-600">{debt.remainingAmount.toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[debt.status]}`}>
                      {STATUS_LABELS[debt.status]}
                    </span>
                  </td>
                  {canSettle && (
                    <td className="px-4 py-3">
                      {debt.remainingAmount > 0 ? (
                        <ActionForm action={settle} className="flex flex-wrap items-center gap-1.5">
                          <input
                            type="number"
                            name="amount"
                            min={1}
                            max={debt.remainingAmount}
                            defaultValue={debt.remainingAmount}
                            className="w-24 rounded-md border border-gray-300 px-2 py-1 text-xs"
                          />
                          <select name="paymentOption" className="rounded-md border border-gray-300 px-2 py-1 text-xs">
                            {paymentOptions.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          <button className="rounded-md bg-brand-green-700 px-2 py-1 text-xs font-semibold text-white hover:bg-brand-green-800">
                            Encaisser
                          </button>
                        </ActionForm>
                      ) : (
                        <span className="text-xs text-gray-400">Soldee</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {debts.length === 0 && (
              <tr><td colSpan={canSettle ? 7 : 6} className="px-4 py-8 text-center text-gray-400">Aucune dette.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
