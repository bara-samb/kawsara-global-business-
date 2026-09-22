import type { Role } from "@prisma/client";

/**
 * Matrice RBAC (section 6 du cahier des charges).
 * Verifiee cote serveur uniquement (Server Actions / Route Handlers) :
 * cacher un bouton cote client ne constitue jamais une protection suffisante.
 */
export const PERMISSIONS: Record<Role, string[]> = {
  ADMIN: ["*"],
  GERANT: [
    "product.*",
    "category.*",
    "customer.*",
    "supplier.*",
    "store.*",
    "stock.*",
    "sale.*",
    "invoice.*",
    "debit.*",
    "debt.*",
    "payment.*",
    "cash.*",
    "supplierOrder.*",
    "ecommerceOrder.*",
    "report.view",
    "profit.view",
    "security.view",
    "user.read",
    "user.create",
    "user.update",
    "notification.read",
  ],
  CAISSIER: [
    "notification.read",
    "product.read",
    "customer.read",
    "customer.create",
    "sale.create",
    "sale.read",
    "invoice.create",
    "invoice.read",
    "payment.create",
    "debt.read",
    "debt.settle",
    "debit.create",
    "debit.read",
    "debit.transform",
    "debit.cancel",
    "cash.open",
    "cash.close",
    "cash.view",
    "ecommerceOrder.read",
    "ecommerceOrder.process",
  ],
  MAGASINIER: [
    "notification.read",
    "product.read",
    "category.read",
    "store.read",
    "stock.read",
    "stock.adjust",
    "supplierOrder.read",
    "supplierOrder.create",
    "supplierOrder.receive",
    "supplier.read",
  ],
  COMPTABLE: [
    "notification.read",
    "invoice.read",
    "invoice.cancel",
    "payment.read",
    "payment.create",
    "debt.read",
    "debt.settle",
    "supplier.read",
    "customer.read",
    "report.view",
    "profit.view",
  ],
  VENDEUR: [
    "notification.read",
    "product.read",
    "customer.read",
    "customer.create",
    "debit.create",
    "debit.read",
    "debit.transform",
    "debit.cancel",
    "invoice.create",
    "invoice.read",
    "payment.create",
    "cash.view",
  ],
  CLIENT: ["shop.browse", "shop.order", "shop.own"],
};

export function can(role: Role, permission: string): boolean {
  const perms = PERMISSIONS[role] ?? [];
  if (perms.includes("*")) return true;
  if (perms.includes(permission)) return true;
  const [resource] = permission.split(".");
  return perms.includes(`${resource}.*`);
}

export class ForbiddenError extends Error {
  constructor(permission: string) {
    super(`Acces refuse : permission manquante "${permission}"`);
    this.name = "ForbiddenError";
  }
}
