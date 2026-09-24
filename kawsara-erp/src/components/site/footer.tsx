import Link from "next/link";
import { Store, FileText, ShieldCheck, Phone, LogIn, UserPlus, LayoutDashboard } from "lucide-react";

const LINK_STYLE =
  "flex items-center gap-2 transition-colors hover:text-brand-gold-300";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-brand-green-100 bg-brand-green-900 text-brand-green-50 print:hidden">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div>
          <p className="text-lg font-extrabold">KAWSARA <span className="text-brand-gold-400">GLOBAL BUSINESS</span></p>
          <p className="mt-2 text-sm text-brand-green-100">
            Plateforme de gestion commerciale et boutique en ligne : produits, stocks,
            ventes, factures et statistiques reunis dans un seul outil.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-gold-400">Liens</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/catalogue" className={LINK_STYLE}><Store className="h-4 w-4" />Catalogue</Link></li>
            <li><Link href="/conditions-generales" className={LINK_STYLE}><FileText className="h-4 w-4" />Conditions generales</Link></li>
            <li><Link href="/politique-de-confidentialite" className={LINK_STYLE}><ShieldCheck className="h-4 w-4" />Politique de confidentialite</Link></li>
            <li><Link href="/contact" className={LINK_STYLE}><Phone className="h-4 w-4" />Contact</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-gold-400">Acces</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/connexion" className={LINK_STYLE}><LogIn className="h-4 w-4" />Espace client</Link></li>
            <li><Link href="/inscription" className={LINK_STYLE}><UserPlus className="h-4 w-4" />Creer un compte</Link></li>
            <li><Link href="/erp" className={LINK_STYLE}><LayoutDashboard className="h-4 w-4" />Espace gestion (ERP)</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-brand-green-100">
        © {new Date().getFullYear()} Kawsara Global Business. Tous droits reserves.
      </div>
    </footer>
  );
}
