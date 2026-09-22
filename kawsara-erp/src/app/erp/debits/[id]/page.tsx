import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { transformDebitToInvoice, cancelDebit } from "@/lib/actions/debits";
import { getPaymentOptions } from "@/lib/payment-options";

const STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente",
  TRANSFORME: "Transforme en facture",
  ANNULE: "Annule",
};

export default async function DebitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const role = session!.user.role;

  const debit = await prisma.debit.findUnique({
    where: { id },
    include: {
      customer: true,
      store: true,
      items: { include: { product: true } },
      invoice: true,
    },
  });
  if (!debit) notFound();

  const total = debit.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const paymentOptions = debit.status === "EN_ATTENTE" ? await getPaymentOptions(prisma) : [];

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-green-900">Debit {debit.reference}</h1>
          <p className="text-sm text-gray-500">{new Date(debit.createdAt).toLocaleString("fr-FR")} — {debit.store.name}</p>
        </div>
        <span className="rounded-full bg-brand-gold-50 px-3 py-1 text-xs font-semibold text-brand-gold-700">
          {STATUS_LABELS[debit.status]}
        </span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-xs uppercase text-gray-500">Client</p>
        <p className="font-medium text-brand-green-900">{debit.customer.name} ({debit.customer.reference})</p>

        <table className="mt-4 min-w-full text-sm">
          <thead className="text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="py-1">Produit</th>
              <th className="py-1">Qte</th>
              <th className="py-1">PU</th>
              <th className="py-1">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {debit.items.map((it) => (
              <tr key={it.id}>
                <td className="py-2">{it.product.name}</td>
                <td className="py-2">{it.quantity}</td>
                <td className="py-2">{it.unitPrice.toLocaleString("fr-FR")}</td>
                <td className="py-2 font-medium">{(it.quantity * it.unitPrice).toLocaleString("fr-FR")}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <p className="text-lg font-bold text-brand-green-900">Total : {total.toLocaleString("fr-FR")} FCFA</p>
        </div>
      </div>

      {debit.invoice ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-600">
            Ce debit a ete transforme en facture{" "}
            <Link href={`/erp/factures/${debit.invoice.id}`} className="font-semibold text-brand-green-700 hover:underline">
              {debit.invoice.reference}
            </Link>.
          </p>
        </div>
      ) : debit.status === "ANNULE" ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">Ce debit a ete annule. La reservation de stock a ete liberee.</p>
        </div>
      ) : (
        <>
          {can(role, "debit.transform") && (
            <form action={transformDebitToInvoice.bind(null, debit.id)} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="font-semibold text-brand-green-900">Transformer en facture</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-brand-green-900">Montant encaisse maintenant (FCFA)</label>
                  <input
                    type="number"
                    name="amountPaid"
                    min={0}
                    max={total}
                    defaultValue={0}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-400">Laisser a 0 pour creer la facture entierement impayee (creance client).</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-brand-green-900">Mode de paiement</label>
                  <select name="paymentOption" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                    <option value="">— Aucun encaissement —</option>
                    {paymentOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="rounded-md bg-brand-green-700 px-5 py-2.5 font-semibold text-white hover:bg-brand-green-800">
                Transformer en facture
              </button>
            </form>
          )}
          {can(role, "debit.cancel") && (
            <form action={cancelDebit.bind(null, debit.id)}>
              <button type="submit" className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
                Annuler ce debit (liberer la reservation)
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
