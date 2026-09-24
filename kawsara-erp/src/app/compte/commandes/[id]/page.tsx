import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelCustomerEcommerceOrder } from "@/lib/actions/ecommerce";
import { ActionForm } from "@/components/action-form";

const STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente de confirmation",
  CONFIRMEE: "Confirmee",
  EN_PREPARATION: "En preparation",
  LIVREE: "Livree",
  ANNULEE: "Annulee",
};

export default async function CommandeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ confirmation?: string }>;
}) {
  const { id } = await params;
  const { confirmation } = await searchParams;
  const session = await auth();

  const order = await prisma.ecommerceOrder.findUnique({
    where: { id },
    include: { items: { include: { product: true } }, invoice: true },
  });

  if (!order || order.customerId !== session?.user.customerId) notFound();

  const canCancel = order.status !== "LIVREE" && order.status !== "ANNULEE";

  return (
    <div>
      {confirmation && (
        <p className="mb-6 rounded-md bg-brand-green-100 px-4 py-3 text-sm font-semibold text-brand-green-800">
          Commande enregistree avec succes ! Reference : {order.reference}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-mono text-gray-400">{order.reference}</p>
          <p className="text-sm text-gray-500">
            Passee le {order.createdAt.toLocaleString("fr-FR")}
          </p>
        </div>
        <span className="rounded-full bg-brand-green-100 px-3 py-1 text-sm font-semibold text-brand-green-700">
          {STATUS_LABELS[order.status]}
        </span>
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
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-brand-green-900">Total</p>
          <p className="mt-2 text-2xl font-bold text-brand-green-800">{order.total.toLocaleString("fr-FR")} FCFA</p>
          {order.invoice && (
            <p className="mt-2 text-xs text-gray-500">
              Facture :{" "}
              <Link href={`/compte/factures/${order.invoice.id}`} className="font-semibold text-brand-green-700 hover:underline">
                {order.invoice.reference}
              </Link>
            </p>
          )}
          {order.status === "ANNULEE" && order.cancelReason && (
            <p className="mt-2 text-xs text-red-600">Motif d&apos;annulation : {order.cancelReason}</p>
          )}
        </div>
      </div>

      {canCancel && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">Annuler cette commande</p>
          <p className="mt-1 text-sm text-red-700">
            La commande sera annulee, la facture sera revoquee et les produits seront remis en stock.
          </p>
          <ActionForm
            action={cancelCustomerEcommerceOrder.bind(null, order.id)}
            className="mt-3"
            confirm={{
              title: "Annuler votre commande ?",
              message: `La commande ${order.reference} sera annulee. Cette action est definitive.`,
              confirmLabel: "Oui, annuler ma commande",
            }}
          >
            <button
              type="submit"
              className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              Annuler la commande
            </button>
          </ActionForm>
        </div>
      )}

      <Link href="/compte/commandes" className="mt-6 inline-block text-sm font-semibold text-brand-green-700 hover:text-brand-gold-600">
        ← Toutes mes commandes
      </Link>
    </div>
  );
}
