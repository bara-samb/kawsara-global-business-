import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { addInvoicePayment } from "@/lib/actions/invoices";
import { getPaymentOptions, PAYMENT_METHOD_LABELS } from "@/lib/payment-options";
import { PrintButton } from "@/components/erp/print-button";
import { amountToFrench } from "@/lib/number-to-french";

const STATUS_LABELS: Record<string, string> = {
  PAYEE: "Payee",
  VALIDEE: "Validee",
  PARTIELLEMENT_PAYEE: "Partiellement payee",
  IMPAYEE: "Impayee",
  BROUILLON: "Brouillon",
  ANNULEE: "Annulee",
};

const ORIGIN_LABELS: Record<string, string> = {
  ECOMMERCE: "Commande en ligne",
  VENTE: "Vente presentielle",
  DEBIT: "Dette client",
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
      seller: true,
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
        <div className="grid gap-4 border-b border-gray-200 pb-6 sm:grid-cols-[1fr_auto]">
          <div className="rounded-lg border border-brand-green-100 bg-brand-green-50/40 p-4">
            <div className="flex items-center gap-4">
            <Image src="/logo-kawsara.jpg" alt="Kawsara Global Business" width={104} height={104} className="h-24 w-24 rounded-full object-cover" />
            <div>
              <p className="text-lg font-extrabold text-brand-green-900">KAWSARA GLOBAL BUSINESS</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-green-800">Import - Export</p>
              <p className="mt-1 text-[9px] text-gray-500">RCCM : SN.DBL.2024.A.3.963</p>
              <p className="text-[9px] text-gray-500">NINEA : 011.539.064</p>
              <p className="text-xs text-gray-500">{invoice.store.name}</p>
              <p className="text-xs text-gray-500">{invoice.store.address}</p>
              {invoice.store.phone && <p className="text-xs text-gray-500">{invoice.store.phone}</p>}
            </div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4 text-right">
            <p className="text-xl font-bold text-brand-green-900">FACTURE</p>
            <p className="font-mono text-sm text-gray-600">{invoice.reference}</p>
            <p className="text-xs text-gray-500">{new Date(invoice.createdAt).toLocaleDateString("fr-FR")}</p>
            <span className="mt-2 inline-block rounded-full bg-brand-green-100 px-2 py-0.5 text-xs font-medium text-brand-green-700">
              {STATUS_LABELS[invoice.status]}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Facture a</p>
            <p className="mt-2 font-semibold text-brand-green-900">{invoice.customer?.name ?? invoice.customerName ?? "Client de passage"}</p>
            {(invoice.customerPhone ?? invoice.customer?.phone) && <p className="text-sm text-gray-500">{invoice.customerPhone ?? invoice.customer?.phone}</p>}
            {invoice.customer?.email && <p className="text-sm text-gray-500">{invoice.customer.email}</p>}
            {invoice.customer?.address && <p className="text-sm text-gray-500">{invoice.customer.address}</p>}
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Traitement</p>
            <p className="mt-2 text-sm"><span className="text-gray-500">Origine :</span> <span className="font-medium">{ORIGIN_LABELS[invoice.origin] ?? invoice.origin}</span></p>
            <p className="text-sm"><span className="text-gray-500">Traitee par :</span> <span className="font-medium">{invoice.seller.name}</span></p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="border-r border-gray-200 px-3 py-2">Référence</th>
              <th className="border-r border-gray-200 px-3 py-2">Désignation</th>
              <th className="border-r border-gray-200 px-3 py-2 text-center">Quantité</th>
              <th className="border-r border-gray-200 px-3 py-2 text-right">Prix unitaire</th>
              <th className="px-3 py-2 text-right">Montant HT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoice.items.map((it) => (
              <tr key={it.id}>
                <td className="border-r border-gray-100 px-3 py-2 font-mono text-xs">{it.product.reference}</td>
                <td className="border-r border-gray-100 px-3 py-2">{it.product.name}</td>
                <td className="border-r border-gray-100 px-3 py-2 text-center">{it.quantity}</td>
                <td className="border-r border-gray-100 px-3 py-2 text-right">{it.unitPrice.toLocaleString("fr-FR")}</td>
                <td className="px-3 py-2 text-right font-medium">{it.total.toLocaleString("fr-FR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-full rounded-lg border border-brand-green-100 bg-brand-green-50/40 px-3 py-2 sm:w-72">
            <div className="space-y-0.5 text-sm leading-5">
            <div className="flex justify-between border-t border-gray-200 pt-1 text-base font-bold text-brand-green-900"><span>Total</span><span>{invoice.total.toLocaleString("fr-FR")} FCFA</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Paye</span><span>{invoice.paidAmount.toLocaleString("fr-FR")} FCFA</span></div>
            <div className="flex justify-between font-semibold text-red-600"><span>Reste a payer</span><span>{invoice.remainingAmount.toLocaleString("fr-FR")} FCFA</span></div>
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-gray-200 px-4 py-3 text-sm">
          <span className="font-semibold">Arrêtée à la somme de :</span>{" "}
          <span className="capitalize">{amountToFrench(invoice.total)}</span>
        </div>

        {invoice.payments.length > 0 && (
          <div className="mt-6 rounded-lg border border-gray-200 p-4">
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

        <div className="mt-6 border-t border-gray-200 pt-3 text-left text-[10px] leading-4 text-gray-500 print:text-[9px]">
          <p className="font-semibold text-brand-green-900">Kawsara Global Business</p>
          <p>RCCM : SN.DBL.2024.A.3953 — NINEA : 011.539.064</p>
          <p>Tél. / WhatsApp : +221 77 743 29 49 — E-mail : kawsaraglobalbusiness@gmail.com</p>
          <p>Touba — Sénégal</p>
        </div>
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
