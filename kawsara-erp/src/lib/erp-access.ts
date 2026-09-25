import type { Role } from "@prisma/client";
import { can } from "@/lib/permissions";

/**
 * Permission requise pour afficher chaque page de l'ERP. Cacher un lien du menu ne suffit pas :
 * sans ce controle, n'importe quel employe pourrait ouvrir une page en tapant son URL.
 * L'ordre compte : le prefixe le plus specifique doit apparaitre avant le plus general.
 */
const ERP_ROUTE_PERMISSIONS: [prefix: string, permission: string | null][] = [
  ["/erp/produits/nouveau", "product.create"],
  ["/erp/produits", "product.read"],
  ["/erp/categories", "category.read"],
  ["/erp/stock/nouveau-depot", "store.create"],
  ["/erp/stock", "stock.read"],
  ["/erp/clients/nouveau", "customer.create"],
  ["/erp/clients", "customer.read"],
  ["/erp/dettes", "debt.read"],
  ["/erp/fournisseurs/nouveau", "supplier.create"],
  ["/erp/fournisseurs", "supplier.read"],
  ["/erp/commandes-fournisseurs/nouveau", "supplierOrder.create"],
  ["/erp/commandes-fournisseurs", "supplierOrder.read"],
  ["/erp/ventes/nouveau", "sale.create"],
  ["/erp/ventes", "sale.read"],
  ["/erp/debits/nouveau", "debit.create"],
  ["/erp/debits", "debit.read"],
  ["/erp/factures", "invoice.read"],
  ["/erp/caisses", "cash.view"],
  ["/erp/commandes-en-ligne", "ecommerceOrder.read"],
  ["/erp/rapports", "report.view"],
  ["/erp/notifications", "notification.read"],
  ["/erp/utilisateurs", "user.read"],
  // Chaque employe peut securiser son propre compte.
  ["/erp/securite/2fa", null],
  ["/erp/securite", "security.view"],
];

export function canAccessErpPath(role: Role, pathname: string): boolean {
  if (role === "CLIENT") return false;
  const match = ERP_ROUTE_PERMISSIONS.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  // Le tableau de bord (/erp) s'adapte deja aux permissions de chaque role.
  if (!match || match[1] === null) return true;
  return can(role, match[1]);
}
