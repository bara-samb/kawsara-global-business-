import Image from "next/image";
import Link from "next/link";
import { Home, Store, Info, Phone, LayoutDashboard } from "lucide-react";
import { auth } from "@/lib/auth";
import { CartBadge } from "@/components/site/cart-badge";
import { MobileMenu, type SiteNavItem } from "@/components/site/mobile-menu";

const NAV: SiteNavItem[] = [
  { href: "/", label: "Accueil", iconKey: "home" },
  { href: "/catalogue", label: "Catalogue", iconKey: "catalogue" },
  { href: "/a-propos", label: "A propos", iconKey: "about" },
  { href: "/contact", label: "Contact", iconKey: "contact" },
];

const DESKTOP_NAV_ICONS = { home: Home, catalogue: Store, about: Info, contact: Phone } as const;

// La boutique n'affiche aucun lien de connexion : les clients commandent sans compte, et
// l'espace gestion a sa propre adresse (/gestion) communiquee uniquement au personnel.
// Seul un employe DEJA connecte voit un raccourci vers l'ERP.
export async function SiteHeader() {
  const session = await auth();
  const isStaff = !!session?.user && session.user.role !== "CLIENT";
  const staffItem: SiteNavItem = { href: "/erp", label: "Espace gestion", iconKey: "dashboard" };

  return (
    <header className="sticky top-0 z-40 border-b border-brand-green-100 bg-white/90 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 shrink-0 transition-transform active:scale-95">
          <Image
            src="/brand/logo-mark.png"
            alt="Kawsara Global Business"
            width={56}
            height={48}
            className="h-10 w-auto sm:h-12"
            priority
          />
          <span className="flex flex-col leading-tight">
            <span className="text-base font-extrabold tracking-wide text-brand-green-800 sm:text-lg">
              KAWSARA
            </span>
            <span className="text-[11px] font-bold tracking-wider text-brand-gold-600 sm:text-xs">
              GLOBAL BUSINESS
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-brand-green-900 md:flex">
          {NAV.map((item) => {
            const Icon = DESKTOP_NAV_ICONS[item.iconKey as keyof typeof DESKTOP_NAV_ICONS];
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-1.5 transition-colors hover:text-brand-gold-600"
              >
                <Icon className="h-4 w-4 text-brand-green-400 transition-colors group-hover:text-brand-gold-500" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <CartBadge />
          {isStaff && (
            <Link
              href="/erp"
              className="hidden items-center gap-1.5 rounded-md bg-brand-green-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-green-800 active:scale-95 sm:flex"
            >
              <LayoutDashboard className="h-4 w-4" />
              Espace gestion
            </Link>
          )}
          <MobileMenu items={isStaff ? [...NAV, staffItem] : NAV} />
        </div>
      </div>
    </header>
  );
}
