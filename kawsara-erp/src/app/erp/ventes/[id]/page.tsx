import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/require-permission";

export default async function VenteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission("sale.read");
  const { id } = await params;

  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      customer: true,
      seller: true,
      store: true,
      items: { include: { product: true } },
      invoice: true,
    },
  });
  if (!sale) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-green-900">Vente {sale.reference}</h1>
          <p className="text-sm text-gray-500">{new Date(sale.createdAt).toLocaleString("fr-FR")} — {sale.store.name}</p>
        </div>
        {sale.invoice && (
          <Link href={`/erp/factures/${sale.invoice.id}`} className="rounded-md bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-800">
            Voir la facture {sale.invoice.reference}
          </Link>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-xs uppercase text-gray-500">Client</p>
            <p className="font-medium text-brand-green-900">{sale.customer?.name ?? sale.customerName ?? "Client de passage"}</p>
            {sale.customer?.phone ?? sale.customerPhone ? (
              <p className="text-sm text-gray-500">{sale.customer?.phone ?? sale.customerPhone}</p>
            ) : null}
          </div>
          <div>
            <p className="text-xs uppercase text-gray-500">Vendeur</p>
            <p className="font-medium text-brand-green-900">{sale.seller.name}</p>
          </div>
        </div>

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
            {sale.items.map((it) => (
              <tr key={it.id}>
                <td className="py-2">{it.product.name}</td>
                <td className="py-2">{it.quantity}</td>
                <td className="py-2">{it.unitPrice.toLocaleString("fr-FR")}</td>
                <td className="py-2 font-medium">{it.total.toLocaleString("fr-FR")}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end gap-8 text-sm">
          <div>
            <p className="text-xs uppercase text-gray-500">Sous-total</p>
            <p className="font-medium">{sale.subtotal.toLocaleString("fr-FR")} FCFA</p>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-500">Remise</p>
            <p className="font-medium">{sale.discount.toLocaleString("fr-FR")} FCFA</p>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-500">Total</p>
            <p className="text-lg font-bold text-brand-green-900">{sale.total.toLocaleString("fr-FR")} FCFA</p>
          </div>
        </div>
      </div>
    </div>
  );
}
