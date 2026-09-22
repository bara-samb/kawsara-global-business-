import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente",
  CONFIRMEE: "Confirmee",
  EN_PREPARATION: "En preparation",
  LIVREE: "Livree",
  ANNULEE: "Annulee",
};

const STATUS_STYLES: Record<string, string> = {
  EN_ATTENTE: "bg-brand-gold-50 text-brand-gold-700",
  CONFIRMEE: "bg-brand-green-100 text-brand-green-700",
  EN_PREPARATION: "bg-brand-green-100 text-brand-green-700",
  LIVREE: "bg-brand-green-100 text-brand-green-700",
  ANNULEE: "bg-red-100 text-red-700",
};

export default async function MesCommandesPage() {
  const session = await auth();
  const customerId = session?.user.customerId;

  const orders = customerId
    ? await prisma.ecommerceOrder.findMany({
        where: { customerId },
        orderBy: { createdAt: "desc" },
        include: { items: true },
      })
    : [];

  if (!customerId) {
    return (
      <p className="rounded-xl border border-dashed border-brand-green-200 bg-white p-8 text-center text-sm text-gray-500">
        Aucun profil client associe a ce compte.
      </p>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-brand-green-200 bg-white p-8 text-center">
        <p className="text-sm text-gray-500">Vous n&apos;avez pas encore passe de commande.</p>
        <Link href="/catalogue" className="mt-4 inline-block rounded-md bg-brand-green-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-green-800">
          Voir le catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3">Reference</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Articles</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-brand-green-50/50">
              <td className="px-4 py-3 font-mono text-xs text-gray-500">
                <Link href={`/compte/commandes/${o.id}`} className="hover:text-brand-gold-600">{o.reference}</Link>
              </td>
              <td className="px-4 py-3">{o.createdAt.toLocaleDateString("fr-FR")}</td>
              <td className="px-4 py-3">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
              <td className="px-4 py-3 font-semibold">{o.total.toLocaleString("fr-FR")} FCFA</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[o.status]}`}>
                  {STATUS_LABELS[o.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
