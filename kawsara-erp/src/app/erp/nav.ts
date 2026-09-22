export type NavIconKey =
  | "dashboard"
  | "products"
  | "categories"
  | "stock"
  | "customers"
  | "debts"
  | "suppliers"
  | "supplierOrders"
  | "sales"
  | "debits"
  | "invoices"
  | "cash"
  | "ecommerceOrders"
  | "reports"
  | "notifications"
  | "users"
  | "security";

export type NavItem = {
  href: string;
  label: string;
  permission: string;
  iconKey: NavIconKey;
};

// Les icones elles-memes (composants React) ne peuvent pas transiter par les props d'un
// Server Component vers un Client Component (RSC ne serialise pas les fonctions) : seule la
// cle textuelle est transmise ici, la resolution vers le composant lucide-react se fait cote
// client dans src/components/erp/nav-icons.tsx.
export const ERP_NAV: NavItem[] = [
  { href: "/erp", label: "Tableau de bord", permission: "report.view", iconKey: "dashboard" },
  { href: "/erp/produits", label: "Produits", permission: "product.read", iconKey: "products" },
  { href: "/erp/categories", label: "Categories", permission: "category.read", iconKey: "categories" },
  { href: "/erp/stock", label: "Stock", permission: "stock.read", iconKey: "stock" },
  { href: "/erp/clients", label: "Clients", permission: "customer.read", iconKey: "customers" },
  { href: "/erp/dettes", label: "Dettes clients", permission: "debt.read", iconKey: "debts" },
  { href: "/erp/fournisseurs", label: "Fournisseurs", permission: "supplier.read", iconKey: "suppliers" },
  { href: "/erp/commandes-fournisseurs", label: "Commandes fournisseurs", permission: "supplierOrder.read", iconKey: "supplierOrders" },
  { href: "/erp/ventes", label: "Ventes", permission: "sale.read", iconKey: "sales" },
  { href: "/erp/debits", label: "Debits", permission: "debit.read", iconKey: "debits" },
  { href: "/erp/factures", label: "Factures", permission: "invoice.read", iconKey: "invoices" },
  { href: "/erp/caisses", label: "Caisses", permission: "cash.view", iconKey: "cash" },
  { href: "/erp/commandes-en-ligne", label: "Commandes en ligne", permission: "ecommerceOrder.read", iconKey: "ecommerceOrders" },
  { href: "/erp/rapports", label: "Rapports", permission: "report.view", iconKey: "reports" },
  { href: "/erp/notifications", label: "Notifications", permission: "notification.read", iconKey: "notifications" },
  { href: "/erp/utilisateurs", label: "Utilisateurs", permission: "user.read", iconKey: "users" },
  { href: "/erp/securite", label: "Centre de securite", permission: "security.view", iconKey: "security" },
];
