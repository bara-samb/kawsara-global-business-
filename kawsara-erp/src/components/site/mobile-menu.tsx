"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Home, Store, Info, Phone, LayoutDashboard } from "lucide-react";

export type SiteIconKey = "home" | "catalogue" | "about" | "contact" | "dashboard";
export type SiteNavItem = { href: string; label: string; iconKey: SiteIconKey };

// Les composants d'icones ne sont pas serialisables a travers la frontiere Server -> Client
// (voir src/app/erp/nav.ts pour la meme contrainte cote ERP) : seule la cle textuelle est
// transmise depuis header.tsx, la resolution se fait ici, cote client.
const ICONS = { home: Home, catalogue: Store, about: Info, contact: Phone, dashboard: LayoutDashboard };

export function MobileMenu({ items }: { items: SiteNavItem[] }) {
  const pathname = usePathname();
  // Le menu est lie a la page sur laquelle il a ete ouvert : il se referme donc tout seul a la
  // navigation, sans setState dans un effet.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = (value: boolean) => setOpenedOn(value ? pathname : null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        className="flex h-9 w-9 items-center justify-center rounded-md text-brand-green-800 transition hover:bg-brand-green-50 active:scale-90"
      >
        <Menu className="h-6 w-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40 animate-fade-in"
          />
          <div className="animate-slide-in-right absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-brand-green-100 px-4 py-4">
              <span className="text-sm font-extrabold uppercase tracking-wide text-brand-green-800">
                Menu
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 active:scale-90"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 p-3">
              {items.map((item) => {
                const Icon = ICONS[item.iconKey];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-brand-green-900 transition hover:bg-brand-green-50 active:scale-[0.98]"
                  >
                    <Icon className="h-5 w-5 text-brand-gold-600" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
