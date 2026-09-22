import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { addInvoicePayment } from "@/lib/actions/invoices";
import { getPaymentOptions, PAYMENT_METHOD_LABELS } from "@/lib/payment-options";
import { PrintButton } from "@/components/erp/print-button";

const STATUS_LABELS: Record<string, string> = {
  PAYEE: "Payee",
  VALIDEE: "Validee",
  PARTIELLEMENT_PAYEE: "Partiellement payee",
  IMPAYEE: "Impayee",
  BROUILLON: "Brouillon",
  ANNULEE: "Annulee",
};

export default async function FactureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const role = session!.user.role;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      store: true,
      customer: true,
      items: { include: { product: true } },
      payments: { include: { cashSession: { include: { cashRegister: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!invoice) notFound();

  const paymentOptions = invoice.remainingAmount > 0 ? await getPaymentOptions(prisma) : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-xl font-bold text-brand-green-900">Facture {invoice.reference}</h1>
        <PrintButton />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-8 print:border-0 print:p-0 print:shadow-none">
        <div className="flex items-start justify-between border-b border-gray-200 pb-6">
          <div className="flex items-center gap-3">
            <Image src="/logo-kawsara.jpg" alt="Kawsara Global Business" width={56} height={56} className="rounded-full" />
            <div>
              <p className="text-lg font-extrabold text-brand-green-900">KAWSARA GLOBAL BUSINESS</p>
              <p className="text-xs text-gray-500">{invoice.store.name}</p>
              <p className="text-xs text-gray-500">{invoice.store.address}</p>
              {invoice.store.phone && <p className="text-xs text-gray-500">{invoice.store.phone}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-brand-green-900">FACTURE</p>
            <p className="font-mono text-sm text-gray-600">{invoice.reference}</p>
            <p className="text-xs text-gray-500">{new Date(invoice.createdAt).toLocaleDateString("fr-FR")}</p>
            <span className="mt-2 inline-block rounded-full bg-brand-green-100 px-2 py-0.5 text-xs font-medium text-brand-green-700">
              {STATUS_LABELS[invoice.status]}
            </span>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs uppercase text-gray-500">Facture a</p>
          <p className="font-semibold text-brand-green-900">{invoice.customer?.name ?? "Client de passage"}</p>
          {invoice.customer && (
            <>
              <p className="text-sm text-gray-500">{invoice.customer.reference}</p>
              <p className="text-sm text-gray-500">{invoice.customer.phone ?? invoice.customer.email ?? ""}</p>
              <p className="text-sm text-gray-500">{invoice.customer.address}</p>
            </>
          )}
        </div>

        <table className="mt-6 min-w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="py-2">Produit</th>
              <th className="py-2">Qte</th>
              <th className="py-2">PU</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoice.items.map((it) => (
              <tr key={it.id}>
                <td className="py-2">{it.product.name}</td>
                <td className="py-2">{it.quantity}</td>
                <td className="py-2">{it.unitPrice.toLocaleString("fr-FR")}</td>
                <td className="py-2 text-right font-medium">{it.total.toLocaleString("fr-FR")}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Sous-total</span><span>{invoice.subtotal.toLocaleString("fr-FR")} FCFA</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Remise</span><span>{invoice.discount.toLocaleString("fr-FR")} FCFA</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Taxe</span><span>{invoice.tax.toLocaleString("fr-FR")} FCFA</span></div>
            <div className="flex justify-between border-t border-gray-200 pt-1 text-base font-bold text-brand-green-900"><span>Total</span><span>{invoice.total.toLocaleString("fr-FR")} FCFA</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Paye</span><span>{invoice.paidAmount.toLocaleString("fr-FR")} FCFA</span></div>
            <div className="flex justify-between font-semibold text-red-600"><span>Reste a payer</span><span>{invoice.remainingAmount.toLocaleString("fr-FR")} FCFA</span></div>
          </div>
        </div>

        {invoice.payments.length > 0 && (
          <div className="mt-6 border-t border-gray-200 pt-4">
            <p className="text-xs font-semibold uppercase text-gray-500">Reglements</p>
            <ul className="mt-2 space-y-1 text-sm">
              {invoice.payments.map((p) => (
                <li key={p.id} className="flex justify-between text-gray-600">
                  <span>
                    {new Date(p.createdAt).toLocaleDateString("fr-FR")} —{" "}
                    {p.cashSession ? p.cashSession.cashRegister.name : PAYMENT_METHOD_LABELS[p.method]}
                  </span>
                  <span className="font-medium">{p.amount.toLocaleString("fr-FR")} FCFA</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-gray-400">Merci de votre confiance — Kawsara Global Business</p>
      </div>

      {invoice.remainingAmount > 0 && can(role, "payment.create") && (
        <form action={addInvoicePayment.bind(null, invoice.id)} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 print:hidden">
          <h2 className="font-semibold text-brand-green-900">Enregistrer un reglement</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-brand-green-900">Montant (FCFA)</label>
              <input
                type="number"
                name="amount"
                min={1}
                max={invoice.remainingAmount}
                defaultValue={invoice.remainingAmount}
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-brand-green-900">Mode de paiement</label>
              <select name="paymentOption" required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">— Choisir —</option>
                {paymentOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className="rounded-md bg-brand-green-700 px-5 py-2.5 font-semibold text-white hover:bg-brand-green-800">
            Enregistrer le reglement
          </button>
        </form>
      )}
    </div>
  );
}
