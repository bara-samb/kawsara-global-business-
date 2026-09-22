import {
  LayoutDashboard,
  Package,
  Tags,
  Warehouse,
  Users,
  Wallet,
  Truck,
  ClipboardList,
  ShoppingCart,
  FileClock,
  Receipt,
  Landmark,
  ShoppingBag,
  BarChart3,
  Bell,
  UserCog,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { NavIconKey } from "@/app/erp/nav";

// Ce fichier n'est importe QUE depuis des Client Components (jamais transmis en props depuis un
// Server Component) : les composants d'icones ne sont pas serialisables a travers la frontiere
// RSC, voir src/app/erp/nav.ts.
export const NAV_ICONS: Record<NavIconKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  products: Package,
  categories: Tags,
  stock: Warehouse,
  customers: Users,
  debts: Wallet,
  suppliers: Truck,
  supplierOrders: ClipboardList,
  sales: ShoppingCart,
  debits: FileClock,
  invoices: Receipt,
  cash: Landmark,
  ecommerceOrders: ShoppingBag,
  reports: BarChart3,
  notifications: Bell,
  users: UserCog,
  security: ShieldCheck,
};
