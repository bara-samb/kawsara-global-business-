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

/**
 * Actions dangereuses (suppressions, annulations, corrections manuelles de stock,
 * gestion des comptes) : reservees a l'ADMIN PRINCIPAL, quel que soit le role.
 * Meme un autre ADMIN ou un GERANT ("*" / "resource.*") ne peut pas les executer.
 */
export const PRINCIPAL_ADMIN_ONLY = new Set<string>([
  "category.delete",
  "product.delete",
  "debit.cancel",
  "invoice.cancel",
  "ecommerceOrder.cancel",
  "stock.adjust",
  "sale.belowCost",
  "user.create",
  "user.update",
  "user.delete",
]);

export function isPrincipalAdminOnly(permission: string): boolean {
  return PRINCIPAL_ADMIN_ONLY.has(permission);
}

export function can(role: Role, permission: string, isPrincipalAdmin = false): boolean {
  if (isPrincipalAdminOnly(permission)) {
    return role === "ADMIN" && isPrincipalAdmin;
  }
  const perms = PERMISSIONS[role] ?? [];
  if (perms.includes("*")) return true;
  if (perms.includes(permission)) return true;
  const [resource] = permission.split(".");
  return perms.includes(`${resource}.*`);
}

// Description lisible de chaque permission, pour les messages d'erreur affiches a l'utilisateur.
const PERMISSION_LABELS: Record<string, string> = {
  "cash.open": "ouvrir une caisse",
  "cash.close": "fermer une caisse",
  "category.create": "creer une categorie",
  "category.delete": "supprimer une categorie",
  "customer.create": "creer un client",
  "customer.update": "modifier un client",
  "debit.create": "creer un debit",
  "debit.transform": "transformer un debit en facture",
  "debit.cancel": "annuler un debit",
  "debt.settle": "encaisser un reglement de dette",
  "ecommerceOrder.process": "traiter une commande en ligne",
  "ecommerceOrder.cancel": "annuler une commande en ligne",
  "invoice.cancel": "annuler une facture",
  "payment.create": "enregistrer un paiement",
  "product.create": "creer un produit",
  "product.update": "modifier un produit",
  "product.delete": "supprimer un produit",
  "report.view": "consulter les rapports",
  "sale.create": "enregistrer une vente",
  "sale.belowCost": "vendre en dessous du prix d'achat",
  "shop.own": "acceder a cet espace client",
  "shop.order": "passer une commande",
  "stock.adjust": "ajuster le stock",
  "store.create": "creer une boutique ou un depot",
  "supplier.create": "creer un fournisseur",
  "supplier.update": "modifier un fournisseur",
  "supplierOrder.create": "creer une commande fournisseur",
  "supplierOrder.receive": "receptionner une commande fournisseur",
  "user.create": "creer un utilisateur",
  "user.update": "activer ou desactiver un utilisateur",
  "user.delete": "supprimer un utilisateur",
};

export function describeForbidden(permission: string): string {
  const label = PERMISSION_LABELS[permission];
  if (isPrincipalAdminOnly(permission)) {
    return `Acces refuse : seul l'administrateur principal peut ${label ?? "effectuer cette action"}.`;
  }
  // Elision francaise : "le droit d'enregistrer", "le droit de creer".
  const de = label && /^[aeiouh]/i.test(label) ? "d'" : "de ";
  return label
    ? `Acces refuse : votre compte n'a pas le droit ${de}${label}.`
    : "Acces refuse : votre compte n'a pas le droit d'effectuer cette action.";
}

export class ForbiddenError extends Error {
  readonly permission: string;

  constructor(permission: string) {
    super(describeForbidden(permission));
    this.name = "ForbiddenError";
    this.permission = permission;
  }
}
