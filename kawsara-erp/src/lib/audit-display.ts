import { describeForbidden } from "@/lib/permissions";

/**
 * Traduction des entrees du journal d'audit (AuditLog) en phrases lisibles pour le Centre de
 * securite : "a annule le debit DEB-2026-000012". Aucun acces base ici : les noms/references des
 * elements concernes sont fournis par l'appelant (resolution groupee, voir la page).
 */

export type AuditCategory =
  | "connexion"
  | "creation"
  | "modification"
  | "suppression"
  | "argent"
  | "stock"
  | "securite"
  | "export";

export const AUDIT_CATEGORIES: Record<AuditCategory, { label: string; badge: string; dot: string }> = {
  connexion: { label: "Connexion", badge: "bg-slate-100 text-slate-700 ring-slate-200", dot: "bg-slate-400" },
  creation: { label: "Creation", badge: "bg-brand-green-100 text-brand-green-800 ring-brand-green-600/20", dot: "bg-brand-green-600" },
  modification: { label: "Modification", badge: "bg-sky-50 text-sky-800 ring-sky-200", dot: "bg-sky-500" },
  suppression: { label: "Suppression / annulation", badge: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-500" },
  argent: { label: "Paiement / caisse", badge: "bg-brand-gold-100 text-brand-gold-700 ring-brand-gold-500/30", dot: "bg-brand-gold-500" },
  stock: { label: "Stock", badge: "bg-violet-50 text-violet-800 ring-violet-200", dot: "bg-violet-500" },
  securite: { label: "Securite", badge: "bg-orange-50 text-orange-800 ring-orange-200", dot: "bg-orange-500" },
  export: { label: "Export", badge: "bg-teal-50 text-teal-800 ring-teal-200", dot: "bg-teal-500" },
};

const ACTIONS: Record<string, { verb: string; category: AuditCategory }> = {
  LOGIN: { verb: "s'est connecte", category: "connexion" },
  LOGOUT: { verb: "s'est deconnecte", category: "connexion" },
  REGISTER: { verb: "a cree son compte", category: "connexion" },
  CREATE: { verb: "a cree", category: "creation" },
  CREATE_BELOW_COST: { verb: "a enregistre a perte", category: "securite" },
  UPDATE: { verb: "a modifie", category: "modification" },
  ACTIVATE: { verb: "a active", category: "modification" },
  DEACTIVATE: { verb: "a desactive", category: "suppression" },
  DELETE: { verb: "a supprime", category: "suppression" },
  CANCEL: { verb: "a annule", category: "suppression" },
  TRANSFORM: { verb: "a transforme en facture", category: "argent" },
  PAYMENT: { verb: "a enregistre un paiement sur", category: "argent" },
  SETTLE: { verb: "a encaisse un reglement sur", category: "argent" },
  OPEN: { verb: "a ouvert", category: "argent" },
  CLOSE: { verb: "a ferme", category: "argent" },
  CONFIRM: { verb: "a confirme", category: "modification" },
  ASSIGN_STORE: { verb: "a assigne un depot a", category: "modification" },
  PREPARE: { verb: "a lance la preparation de", category: "stock" },
  DELIVER: { verb: "a livre", category: "stock" },
  RECEIVE: { verb: "a receptionne", category: "stock" },
  STOCK_ADJUST: { verb: "a corrige", category: "stock" },
  EXPORT: { verb: "a exporte", category: "export" },
  ACCESS_DENIED: { verb: "a tente une action non autorisee", category: "securite" },
  "2FA_ENABLED": { verb: "a active la double authentification", category: "securite" },
  "2FA_DISABLED": { verb: "a desactive la double authentification", category: "securite" },
  "2FA_SECRET_GENERATED": { verb: "a commence a configurer la double authentification", category: "securite" },
  SET_PRINCIPAL_ADMIN: { verb: "a ete designe administrateur principal", category: "securite" },
};

/** Actions de chaque categorie : sert au filtre "Type d'action". */
export function actionsOfCategory(category: AuditCategory): string[] {
  return Object.entries(ACTIONS)
    .filter(([, a]) => a.category === category)
    .map(([action]) => action);
}

export const ENTITIES: Record<string, { label: string; href?: (id: string) => string }> = {
  Sale: { label: "la vente", href: (id) => `/erp/ventes/${id}` },
  Invoice: { label: "la facture", href: (id) => `/erp/factures/${id}` },
  Debit: { label: "le debit", href: (id) => `/erp/debits/${id}` },
  EcommerceOrder: { label: "la commande en ligne", href: (id) => `/erp/commandes-en-ligne/${id}` },
  Customer: { label: "le client", href: (id) => `/erp/clients/${id}` },
  CustomerDebt: { label: "la dette" },
  Supplier: { label: "le fournisseur", href: (id) => `/erp/fournisseurs/${id}` },
  SupplierOrder: { label: "la commande fournisseur", href: (id) => `/erp/commandes-fournisseurs/${id}` },
  Product: { label: "le produit", href: (id) => `/erp/produits/${id}` },
  Category: { label: "la categorie" },
  Store: { label: "la boutique" },
  User: { label: "le compte" },
  CashSession: { label: "la caisse" },
  Stock: { label: "le stock" },
  Report: { label: "le rapport" },
};

// Actions sans complement ("s'est connecte") : l'element concerne est l'utilisateur lui-meme.
const NO_OBJECT = new Set([
  "LOGIN", "LOGOUT", "REGISTER", "ACCESS_DENIED", "2FA_ENABLED", "2FA_DISABLED", "2FA_SECRET_GENERATED", "SET_PRINCIPAL_ADMIN",
]);

const DETAIL_LABELS: Record<string, string> = {
  reference: "Reference",
  previousStatus: "Ancien statut",
  reason: "Motif",
  email: "Email",
  role: "Role",
  name: "Nom",
  client: "Client",
  telephone: "Telephone",
  auteur: "Auteur",
};

const STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente",
  CONFIRMEE: "Confirmee",
  EN_PREPARATION: "En preparation",
  LIVREE: "Livree",
  ANNULEE: "Annulee",
};

export type AuditLogLike = {
  action: string;
  entity: string;
  entityId: string | null;
  metadata: string | null;
};

export type DescribedAudit = {
  verb: string;
  category: AuditCategory;
  object?: { label: string; name?: string; href?: string };
  details: { label: string; value: string }[];
};

export function parseMetadata(metadata: string | null): Record<string, unknown> | null {
  if (!metadata) return null;
  try {
    const value = JSON.parse(metadata);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * @param names nom lisible (reference, nom...) des elements, par "Entite:id" ; pour STOCK_ADJUST,
 *              aussi "Product:<id>" et "Store:<id>" tires des metadonnees.
 */
export function describeAudit(log: AuditLogLike, names: Map<string, string>): DescribedAudit {
  const known = ACTIONS[log.action];
  const verb = known?.verb ?? `a effectue l'action ${log.action}`;
  const category = known?.category ?? "modification";
  const meta = parseMetadata(log.metadata);
  const details: { label: string; value: string }[] = [];

  if (log.action === "ACCESS_DENIED") {
    // entity contient ici le code de permission refusee.
    details.push({ label: "Refus", value: describeForbidden(log.entity).replace(/^Acces refuse : /, "") });
    if (log.metadata && !meta) details.push({ label: "Precision", value: log.metadata });
    return { verb, category, details };
  }

  if (log.action === "STOCK_ADJUST" && meta) {
    const product = names.get(`Product:${meta.productId}`) ?? "produit supprime";
    const store = names.get(`Store:${meta.storeId}`);
    if (store) details.push({ label: "Depot", value: store });
    details.push({ label: "Quantite", value: `${meta.previousQuantity} → ${meta.newQuantity}` });
    if (meta.reason) details.push({ label: "Motif", value: String(meta.reason) });
    return { verb, category, object: { label: "le stock de", name: product, href: `/erp/produits/${meta.productId}` }, details };
  }

  if (log.action === "EXPORT") {
    return { verb, category, object: { label: "le rapport", name: log.metadata ?? undefined }, details };
  }

  if (meta) {
    for (const [key, raw] of Object.entries(meta)) {
      if (raw === undefined || raw === null || raw === "" || key === "reference" || key === "name") continue;
      const value = key === "previousStatus" ? STATUS_LABELS[String(raw)] ?? String(raw) : String(raw);
      details.push({ label: DETAIL_LABELS[key] ?? key, value });
    }
  } else if (log.metadata) {
    details.push({ label: "Precision", value: log.metadata });
  }

  if (NO_OBJECT.has(log.action)) return { verb, category, details };

  const entity = ENTITIES[log.entity];
  const name =
    (log.entityId && names.get(`${log.entity}:${log.entityId}`)) ||
    (meta?.reference ? String(meta.reference) : undefined) ||
    (meta?.name ? String(meta.name) : undefined);
  const exists = !!(log.entityId && names.has(`${log.entity}:${log.entityId}`));
  const deleted = !name && !!log.entityId && !exists;

  return {
    verb,
    category,
    object: {
      label: log.entity === "User" && log.action.endsWith("ACTIVATE") ? "le compte de" : entity?.label ?? log.entity,
      name: deleted ? "(supprime depuis)" : name,
      href: exists && entity?.href && log.entityId ? entity.href(log.entityId) : undefined,
    },
    details,
  };
}
