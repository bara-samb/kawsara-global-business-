/** Cumule les quantites par produit (plusieurs lignes peuvent viser le meme produit). */
export function sumQuantitiesByProduct(items: { productId: string; quantity: number }[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of items) {
    totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.quantity);
  }
  return totals;
}
