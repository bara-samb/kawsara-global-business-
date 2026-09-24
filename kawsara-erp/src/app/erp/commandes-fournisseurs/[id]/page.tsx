import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { receiveSupplierOrder } from "@/lib/actions/supplier-orders";
import { SupplierReceiptForm } from "@/components/erp/supplier-receipt-form";
import { ActionForm } from "@/components/action-form";
import { requirePagePermission } from "@/lib/require-permission";

const STATUS_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  ENVOYEE: "Envoyee",
  PARTIELLEMENT_RECUE: "Partiellement recue",
  RECUE: "Recue",
  ANNULEE: "Annulee",
};

export default async function CommandeFournisseurDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission("supplierOrder.read");
  const { id } = await params;
  const session = await auth();
  const role = session!.user.role;

  const order = await prisma.supplierOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      store: true,
      items: { include: { product: true } },
      receipts: { include: { items: { include: { product: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) notFound();

  const total = order.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  const canReceive = can(role, "supplierOrder.receive") && order.status !== "RECUE" && order.status !== "ANNULEE";

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-green-900">Commande {order.reference}</h1>
          <p className="text-sm text-gray-500">{order.supplier.name} — {order.store.name}</p>
        </div>
        <span className="rounded-full bg-brand-gold-50 px-3 py-1 text-xs font-semibold text-brand-gold-700">
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <table className="min-w-full text-sm">
          <thead className="text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="py-1">Produit</th>
              <th className="py-1">Qte commandee</th>
              <th className="py-1">Qte recue</th>
              <th className="py-1">Prix achat</th>
              <th className="py-1">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.items.map((it) => (
              <tr key={it.id}>
                <td className="py-2">{it.product.name}</td>
                <td className="py-2">{it.quantity}</td>
                <td className="py-2">{it.receivedQuantity}</td>
                <td className="py-2">{it.unitCost.toLocaleString("fr-FR")}</td>
                <td className="py-2 font-medium">{(it.quantity * it.unitCost).toLocaleString("fr-FR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex justify-end">
          <p className="text-lg font-bold text-brand-green-900">Total : {total.toLocaleString("fr-FR")} FCFA</p>
        </div>
      </div>

      {canReceive && (
        <ActionForm action={receiveSupplierOrder.bind(null, order.id)} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="font-semibold text-brand-green-900">Receptionner la marchandise</h2>
          <SupplierReceiptForm
            items={order.items.map((i) => ({
              id: i.id,
              productName: i.product.name,
              quantity: i.quantity,
              receivedQuantity: i.receivedQuantity,
            }))}
          />
          <button type="submit" className="rounded-md bg-brand-green-700 px-5 py-2.5 font-semibold text-white hover:bg-brand-green-800">
            Confirmer la reception
          </button>
        </ActionForm>
      )}

      {order.receipts.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="font-semibold text-brand-green-900">Historique des receptions</h2>
          <ul className="mt-3 divide-y divide-gray-100 text-sm">
            {order.receipts.map((r) => (
              <li key={r.id} className="py-2">
                <p className="font-mono text-xs text-gray-500">{r.reference} — {new Date(r.createdAt).toLocaleString("fr-FR")}</p>
                <ul className="mt-1 space-y-0.5 pl-4 text-xs text-gray-600">
                  {r.items.map((it) => (
                    <li key={it.id}>{it.product.name} : {it.quantity}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
