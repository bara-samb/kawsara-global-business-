"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import type { NavItem } from "@/app/erp/nav";
import { SidebarNav } from "@/components/erp/sidebar-nav";

export function MobileSidebar({
  items,
  userName,
  roleLabel,
  signOutAction,
}: {
  items: NavItem[];
  userName: string;
  roleLabel: string;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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
          <div className="animate-slide-in-right absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-brand-green-900 text-white shadow-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-4">
              <div className="flex items-center gap-2">
                <Image src="/logo-kawsara.jpg" alt="Kawsara" width={32} height={32} className="rounded-full" />
                <div className="leading-tight">
                  <p className="text-sm font-extrabold">KAWSARA</p>
                  <p className="text-[10px] font-semibold text-brand-gold-400">ERP GESTION</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className="flex h-8 w-8 items-center justify-center rounded-md text-brand-green-100 transition hover:bg-white/10 active:scale-90"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <SidebarNav items={items} onNavigate={() => setOpen(false)} />

            <div className="border-t border-white/10 p-4 text-xs">
              <p className="font-semibold">{userName}</p>
              <p className="text-brand-green-100">{roleLabel}</p>
              <Link href="/erp/securite/2fa" className="mt-2 block text-brand-gold-400 hover:text-brand-gold-300">
                Securiser mon compte (2FA)
              </Link>
              <form action={signOutAction}>
                <button className="mt-2 text-brand-gold-400 hover:text-brand-gold-300" type="submit">
                  Se deconnecter
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
