import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getPaymentOptions } from "@/lib/payment-options";
import { PrintButton } from "@/components/erp/print-button";
import {
  assignEcommerceOrderStore,
  confirmEcommerceOrder,
  startPreparationEcommerceOrder,
  markDeliveredEcommerceOrder,
  cancelEcommerceOrder,
} from "@/lib/actions/ecommerce";

const STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente",
  CONFIRMEE: "Confirmee",
  EN_PREPARATION: "En preparation",
  LIVREE: "Livree",
  ANNULEE: "Annulee",
};

export default async function CommandeEnLigneDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const role = session!.user.role;
  const canProcess = can(role, "ecommerceOrder.process");

  const order = await prisma.ecommerceOrder.findUnique({
    where: { id },
    include: { customer: true, store: true, invoice: true, items: { include: { product: true } } },
  });
  if (!order) notFound();

  const [stores, paymentOptions] = await Promise.all([
    prisma.store.findMany({ orderBy: { name: "asc" } }),
    getPaymentOptions(prisma),
  ]);

  const confirmAction = confirmEcommerceOrder.bind(null, order.id);
  const prepareAction = startPreparationEcommerceOrder.bind(null, order.id);
  const deliverAction = markDeliveredEcommerceOrder.bind(null, order.id);
  const cancelAction = cancelEcommerceOrder.bind(null, order.id);
  const assignAction = assignEcommerceOrderStore.bind(null, order.id);

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-brand-green-900">Commande {order.reference}</h1>
          <p className="text-sm text-gray-500">{order.customer.name} — {order.createdAt.toLocaleString("fr-FR")}</p>
        </div>
        <div className="flex items-center gap-2">
          {order.invoice && <PrintButton />}
          <span className="rounded-full bg-brand-green-100 px-3 py-1 text-sm font-semibold text-brand-green-700">
            {STATUS_LABELS[order.status]}
          </span>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Produit</th>
              <th className="px-4 py-3">Quantite</th>
              <th className="px-4 py-3">Prix unitaire</th>
              <th className="px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">{item.product.name}</td>
                <td className="px-4 py-3">{item.quantity}</td>
                <td className="px-4 py-3">{item.unitPrice.toLocaleString("fr-FR")} FCFA</td>
                <td className="px-4 py-3 font-semibold">{(item.quantity * item.unitPrice).toLocaleString("fr-FR")} FCFA</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-brand-green-900">Livraison</p>
          <p className="mt-2 text-sm text-gray-600">{order.shippingAddress}</p>
          <p className="text-sm text-gray-600">{order.shippingPhone}</p>
          {order.notes && <p className="mt-2 text-xs text-gray-400">Notes : {order.notes}</p>}
          <p className="mt-2 text-xs text-gray-400">Depot : {order.store?.name ?? "Non assigne"}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-brand-green-900">Total</p>
          <p className="mt-2 text-2xl font-bold text-brand-green-800">{order.total.toLocaleString("fr-FR")} FCFA</p>
          {order.invoice && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span>Facture :</span>
              <Link href={`/erp/factures/${order.invoice.id}`} className="font-semibold text-brand-green-700 hover:underline">
                {order.invoice.reference}
              </Link>
              <Link
                href={`/erp/factures/${order.invoice.id}`}
                className="rounded-md border border-brand-green-200 px-2 py-1 font-semibold text-brand-green-700 hover:bg-brand-green-50"
              >
                Ouvrir / telecharger PDF
              </Link>
            </div>
          )}
          {order.status === "ANNULEE" && order.cancelReason && (
            <p className="mt-2 text-xs text-red-600">Motif : {order.cancelReason}</p>
          )}
        </div>
      </div>

      {canProcess && order.status !== "LIVREE" && order.status !== "ANNULEE" && (
        <div className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-brand-green-900">Traitement</p>

          {order.status === "EN_ATTENTE" && !order.storeId && (
            <form action={assignAction} className="flex flex-wrap items-end gap-2">
              <div>
                <label className="text-xs font-medium text-brand-green-900">Assigner un depot</label>
                <select name="storeId" required className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="">— Choisir —</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <button className="rounded-md bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-800">
                Assigner
              </button>
            </form>
          )}

          {order.status === "EN_ATTENTE" && order.storeId && (
            <form action={confirmAction}>
              <button className="rounded-md bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-800">
                Valider la commande et generer la facture
              </button>
            </form>
          )}

          {order.status === "CONFIRMEE" && (
            <form action={prepareAction}>
              <button className="rounded-md bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-800">
                Debuter la preparation
              </button>
            </form>
          )}

          {order.status === "EN_PREPARATION" && (
            <form action={deliverAction} className="flex flex-wrap items-end gap-2">
              <div>
                <label className="text-xs font-medium text-brand-green-900">Mode d&apos;encaissement</label>
                <select name="paymentOption" required className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm">
                  {paymentOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <button className="rounded-md bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-800">
                Marquer livree &amp; facturer
              </button>
            </form>
          )}

          <form action={cancelAction} className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-brand-green-900">Motif d&apos;annulation</label>
              <input name="reason" required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <button className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
              {order.status === "EN_ATTENTE" ? "Rejeter la commande" : "Annuler la commande"}
            </button>
          </form>
        </div>
      )}

      <Link href="/erp/commandes-en-ligne" className="mt-6 inline-block text-sm font-semibold text-brand-green-700 hover:text-brand-gold-600">
        ← Toutes les commandes
      </Link>
    </div>
  );
}
