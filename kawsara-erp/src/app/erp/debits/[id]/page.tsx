import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { transformDebitToInvoice, cancelDebit } from "@/lib/actions/debits";
import { getPaymentOptions } from "@/lib/payment-options";
import { PrintButton } from "@/components/erp/print-button";
import Image from "next/image";
import { amountToFrench } from "@/lib/number-to-french";
import { ActionForm } from "@/components/action-form";
import { requirePagePermission } from "@/lib/require-permission";

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
  await requirePagePermission("debit.read");
  const { id } = await params;
  const session = await auth();
  const role = session!.user.role;
  const isPrincipalAdmin = session!.user.isPrincipalAdmin;

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
    <div className="debit-document max-w-3xl space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-brand-green-900">Debit {debit.reference}</h1>
          <p className="text-sm text-gray-500">{new Date(debit.createdAt).toLocaleString("fr-FR")} — {debit.store.name}</p>
        </div>
        <PrintButton label="Télécharger le débit PDF" />
        <span className="rounded-full bg-brand-gold-50 px-3 py-1 text-xs font-semibold text-brand-gold-700">
          {STATUS_LABELS[debit.status]}
        </span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-8 print:border-0 print:p-0">
        <div className="grid gap-4 border-b border-gray-200 pb-6 sm:grid-cols-[1fr_auto]">
          <div className="rounded-lg border border-brand-green-100 bg-brand-green-50/40 p-4">
            <div className="flex items-center gap-4">
              <Image src="/brand/logo-mark.png" alt="Kawsara Global Business" width={118} height={101} className="h-auto w-24 shrink-0" />
              <div>
                <p className="text-lg font-extrabold text-brand-green-900">KAWSARA GLOBAL BUSINESS</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-green-800">Import - Export</p>
                <p className="text-[9px] text-gray-500">RCCM : SN.DBL.2024.A.3953</p>
                <p className="text-[9px] text-gray-500">NINEA : 011.539.064</p>
                <p className="text-xs text-gray-500">{debit.store.name}</p>
                <p className="text-xs text-gray-500">{debit.store.address}</p>
                {debit.store.phone && <p className="text-xs text-gray-500">{debit.store.phone}</p>}
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4 text-right">
            <p className="text-xl font-bold text-brand-green-900">DÉBIT</p>
            <p className="font-mono text-sm text-gray-600">{debit.reference}</p>
            <p className="text-xs text-gray-500">{new Date(debit.createdAt).toLocaleDateString("fr-FR")}</p>
            <span className="mt-2 inline-block rounded-full bg-brand-gold-50 px-2 py-0.5 text-xs font-medium text-brand-gold-700">
              {STATUS_LABELS[debit.status]}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Débiteur</p>
            <p className="mt-2 font-semibold text-brand-green-900">{debit.customer.name}</p>
            <p className="text-sm text-gray-500">{debit.customer.reference}</p>
            {debit.customer.phone && <p className="text-sm text-gray-500">{debit.customer.phone}</p>}
            {debit.customer.address && <p className="text-sm text-gray-500">{debit.customer.address}</p>}
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Nature du document</p>
            <p className="mt-2 text-sm font-medium text-brand-green-900">Débit client</p>
            <p className="text-sm text-gray-500">Dépôt : {debit.store.name}</p>
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
              <th className="px-3 py-2 text-right">Montant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {debit.items.map((it) => (
              <tr key={it.id}>
                <td className="border-r border-gray-100 px-3 py-2 font-mono text-xs">{it.product.reference}</td>
                <td className="border-r border-gray-100 px-3 py-2">{it.product.name}</td>
                <td className="border-r border-gray-100 px-3 py-2 text-center">{it.quantity}</td>
                <td className="border-r border-gray-100 px-3 py-2 text-right">{it.unitPrice.toLocaleString("fr-FR")}</td>
                <td className="px-3 py-2 text-right font-medium">{(it.quantity * it.unitPrice).toLocaleString("fr-FR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-full rounded-lg border border-brand-green-100 bg-brand-green-50/40 px-3 py-2 sm:w-72">
            <div className="flex justify-between text-base font-bold text-brand-green-900">
              <span>Total</span><span>{total.toLocaleString("fr-FR")} FCFA</span>
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-gray-200 px-4 py-3 text-sm">
          <span className="font-semibold">Arrêtée à la somme de :</span>{" "}
          <span className="capitalize">{amountToFrench(total)}</span>
        </div>
        <div className="mt-6 border-t border-gray-200 pt-3 text-left text-[10px] leading-4 text-gray-500 print:text-[9px]">
          <p className="font-semibold text-brand-green-900">Kawsara Global Business</p>
          <p>RCCM : SN.DBL.2024.A.3953 — NINEA : 011.539.064</p>
          <p>Tél. / WhatsApp : +221 77 743 29 49 — E-mail : kawsaraglobalbusiness@gmail.com</p>
          <p>Touba — Sénégal</p>
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
            <ActionForm action={transformDebitToInvoice.bind(null, debit.id)} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 print:hidden">
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
            </ActionForm>
          )}
          {can(role, "debit.cancel", isPrincipalAdmin) && (
            <ActionForm
              action={cancelDebit.bind(null, debit.id)}
              className="print:hidden"
              confirm={{
                title: "Annuler ce debit ?",
                message: `Le debit ${debit.reference} sera annule et le stock reserve sera libere. Il ne pourra plus etre transforme en facture.`,
                confirmLabel: "Oui, annuler le debit",
              }}
            >
              <button type="submit" className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
                Annuler ce debit (liberer la reservation)
              </button>
            </ActionForm>
          )}
        </>
      )}
    </div>
  );
}
