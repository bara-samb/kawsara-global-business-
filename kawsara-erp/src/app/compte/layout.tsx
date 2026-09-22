import Link from "next/link";
import { ShoppingBag, Receipt, UserCircle, LogOut } from "lucide-react";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { auth, signOut } from "@/lib/auth";

export default async function CompteLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-green-100 pb-4">
            <div>
              <h1 className="text-xl font-bold text-brand-green-900">Mon compte</h1>
              {session?.user && <p className="text-sm text-gray-500">{session.user.name} — {session.user.email}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm font-semibold">
              <Link href="/compte/commandes" className="flex items-center gap-1.5 text-brand-green-700 transition hover:text-brand-gold-600">
                <ShoppingBag className="h-4 w-4" />
                Mes commandes
              </Link>
              <Link href="/compte/factures" className="flex items-center gap-1.5 text-brand-green-700 transition hover:text-brand-gold-600">
                <Receipt className="h-4 w-4" />
                Mes factures
              </Link>
              <Link href="/compte/profil" className="flex items-center gap-1.5 text-brand-green-700 transition hover:text-brand-gold-600">
                <UserCircle className="h-4 w-4" />
                Mon profil
              </Link>
              <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
                <button type="submit" className="flex items-center gap-1.5 text-red-600 transition hover:text-red-700">
                  <LogOut className="h-4 w-4" />
                  Se deconnecter
                </button>
              </form>
            </div>
          </div>
          <div className="animate-fade-in mt-6">{children}</div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
