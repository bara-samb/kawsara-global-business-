import "server-only";
import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "@/lib/permissions";
import { UserError } from "@/lib/errors";
import { requirePermission } from "@/lib/require-permission";

type PricedItem = { productId: string; quantity: number; unitPrice: number };

/**
 * Les prix d'une vente / d'un debit sont saisis cote navigateur (prix negocies autorises).
 * Garde-fou anti-fraude : vendre EN DESSOUS du prix d'achat (par article, ou au total apres
 * remise) est reserve a l'admin principal. A appeler AVANT la transaction d'ecriture.
 * Renvoie la liste des ventes a perte autorisees, a journaliser.
 */
export async function assertPricesAllowed(items: PricedItem[], discount = 0): Promise<string[]> {
  const products = await prisma.product.findMany({
    where: { id: { in: [...new Set(items.map((i) => i.productId))] } },
    select: { id: true, name: true, purchasePrice: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const problems: string[] = [];
  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product) throw new UserError("Un des produits n'existe plus. Rechargez la page.");
    if (item.unitPrice < product.purchasePrice) {
      problems.push(
        `"${product.name}" a ${item.unitPrice.toLocaleString("fr-FR")} FCFA (prix d'achat : ${product.purchasePrice.toLocaleString("fr-FR")} FCFA)`
      );
    }
  }

  const cost = items.reduce((s, i) => s + (byId.get(i.productId)?.purchasePrice ?? 0) * i.quantity, 0);
  const total = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0) - discount;
  if (problems.length === 0 && total < cost) {
    problems.push(
      `total apres remise de ${total.toLocaleString("fr-FR")} FCFA, pour un cout d'achat de ${cost.toLocaleString("fr-FR")} FCFA`
    );
  }
  if (problems.length === 0) return [];

  try {
    await requirePermission("sale.belowCost");
  } catch (error) {
    if (error instanceof ForbiddenError) {
      throw new UserError(
        `Vente a perte refusee : ${problems.join(" ; ")}. Seul l'administrateur principal peut vendre en dessous du prix d'achat.`
      );
    }
    throw error;
  }
  return problems;
}
