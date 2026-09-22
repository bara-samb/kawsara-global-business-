"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/app/erp/nav";
import { NAV_ICONS } from "@/components/erp/nav-icons";

export function SidebarNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4 text-sm">
      {items.map((item) => {
        const active = item.href === "/erp" ? pathname === "/erp" : pathname.startsWith(item.href);
        const Icon = NAV_ICONS[item.iconKey];
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-md px-3 py-2 font-medium transition-colors ${
              active
                ? "bg-white/15 text-white"
                : "text-brand-green-50 hover:bg-white/10"
            }`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${active ? "text-brand-gold-400" : "text-brand-green-200"}`} />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
