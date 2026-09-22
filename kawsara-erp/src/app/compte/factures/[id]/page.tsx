import Image from "next/image";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PAYMENT_METHOD_LABELS } from "@/lib/payment-options";
import { PrintButton } from "@/components/erp/print-button";

const STATUS_LABELS: Record<string, string> = {
  PAYEE: "Payee",
  VALIDEE: "Validee",
  PARTIELLEMENT_PAYEE: "Partiellement payee",
  IMPAYEE: "Impayee",
  BROUILLON: "Brouillon",
  ANNULEE: "Annulee",
};

export default async function MaFactureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      store: true,
      customer: true,
      items: { include: { product: true } },
      payments: true,
    },
  });

  // Un client ne doit jamais pouvoir consulter la facture d'un autre client.
  if (!invoice || invoice.customerId !== session?.user.customerId) notFound();

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
              {invoice.store.phone && <p className="text-xs text-gray-500">{invoice.store.phone}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-brand-green-900">FACTURE</p>
            <p className="font-mono text-sm text-gray-600">{invoice.reference}</p>
            <p className="text-xs text-gray-500">{invoice.createdAt.toLocaleDateString("fr-FR")}</p>
            <span className="mt-2 inline-block rounded-full bg-brand-green-100 px-2 py-0.5 text-xs font-medium text-brand-green-700">
              {STATUS_LABELS[invoice.status]}
            </span>
          </div>
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
                  <span>{p.createdAt.toLocaleDateString("fr-FR")} — {PAYMENT_METHOD_LABELS[p.method]}</span>
                  <span className="font-medium">{p.amount.toLocaleString("fr-FR")} FCFA</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-gray-400">Merci de votre confiance — Kawsara Global Business</p>
      </div>
    </div>
  );
}
