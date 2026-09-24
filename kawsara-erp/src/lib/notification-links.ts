export function getNotificationHref(type: string, entityId?: string | null) {
  if (type === "NOUVELLE_COMMANDE" && entityId) return `/erp/commandes-en-ligne/${entityId}`;
  if (type === "PAIEMENT_RECU" && entityId) return `/erp/factures/${entityId}`;
  if (type === "DETTE_SOLDEE" && entityId) return `/erp/dettes`;
  if (type === "STOCK_BAS" && entityId) return `/erp/produits/${entityId}`;
  if (type === "COMPTE_VERROUILLE" && entityId) return `/erp/utilisateurs`;
  return "/erp/notifications";
}
