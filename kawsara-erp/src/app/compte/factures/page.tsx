import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUS_LABELS: Record<string, string> = {
  PAYEE: "Payee",
  VALIDEE: "Validee",
  PARTIELLEMENT_PAYEE: "Partiellement payee",
  IMPAYEE: "Impayee",
  BROUILLON: "Brouillon",
  ANNULEE: "Annulee",
};

const STATUS_STYLES: Record<string, string> = {
  PAYEE: "bg-brand-green-100 text-brand-green-700",
  VALIDEE: "bg-brand-green-100 text-brand-green-700",
  PARTIELLEMENT_PAYEE: "bg-brand-gold-50 text-brand-gold-700",
  IMPAYEE: "bg-red-100 text-red-700",
  BROUILLON: "bg-gray-100 text-gray-500",
  ANNULEE: "bg-gray-100 text-gray-500",
};

export default async function MesFacturesPage() {
  const session = await auth();
  const customerId = session?.user.customerId;

  const invoices = customerId
    ? await prisma.invoice.findMany({
        where: { customerId },
        orderBy: { createdAt: "desc" },
      })
    : [];

  if (!customerId || invoices.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-brand-green-200 bg-white p-8 text-center text-sm text-gray-500">
        {customerId ? "Vous n'avez pas encore de facture." : "Aucun profil client associe a ce compte."}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3">Reference</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Reste</th>
            <th className="px-4 py-3">Statut</th>
            <th className="px-4 py-3">Document</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {invoices.map((inv) => (
            <tr key={inv.id} className="hover:bg-brand-green-50/50">
              <td className="px-4 py-3 font-mono text-xs text-gray-500">
                <Link href={`/compte/factures/${inv.id}`} className="hover:text-brand-gold-600">{inv.reference}</Link>
              </td>
              <td className="px-4 py-3">{inv.createdAt.toLocaleDateString("fr-FR")}</td>
              <td className="px-4 py-3 font-semibold">{inv.total.toLocaleString("fr-FR")} FCFA</td>
              <td className="px-4 py-3">
                {inv.remainingAmount > 0 ? (
                  <span className="font-semibold text-red-600">{inv.remainingAmount.toLocaleString("fr-FR")}</span>
                ) : (
                  <span className="text-gray-400">0</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[inv.status]}`}>
                  {STATUS_LABELS[inv.status]}
                </span>
              </td>
              <td className="px-4 py-3">
                {inv.status === "PAYEE" && inv.remainingAmount === 0 ? (
                  <Link
                    href={`/compte/factures/${inv.id}`}
                    className="whitespace-nowrap text-xs font-semibold text-brand-green-700 hover:underline"
                  >
                    Télécharger PDF
                  </Link>
                ) : (
                  <span className="text-xs text-gray-400">Après règlement</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
