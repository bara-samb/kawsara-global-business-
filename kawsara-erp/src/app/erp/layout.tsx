import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { NotificationsBell } from "@/components/erp/notifications-bell";
import { SidebarNav } from "@/components/erp/sidebar-nav";
import { MobileSidebar } from "@/components/erp/mobile-sidebar";
import { ERP_NAV } from "./nav";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  GERANT: "Gerant",
  CAISSIER: "Caissier",
  MAGASINIER: "Magasinier",
  COMPTABLE: "Comptable",
  VENDEUR: "Vendeur",
  CLIENT: "Client",
};

export default async function ErpLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role === "CLIENT") {
    redirect("/gestion");
  }

  const items = ERP_NAV.filter((item) => can(session.user.role, item.permission));

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-brand-green-100 bg-brand-green-900 text-white md:flex print:hidden">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-2 ring-brand-gold-400/60">
            <Image src="/brand/logo-mark.png" alt="Kawsara" width={42} height={36} className="h-auto w-[70%]" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-extrabold">KAWSARA</p>
            <p className="text-[10px] font-semibold text-brand-gold-400">ERP GESTION</p>
          </div>
        </div>
        <SidebarNav items={items} />
        <div className="border-t border-white/10 p-4 text-xs">
          <p className="font-semibold">{session.user.name}</p>
          <p className="text-brand-green-100">{ROLE_LABELS[session.user.role]}</p>
          <Link href="/erp/securite/2fa" className="mt-2 block text-brand-gold-400 hover:text-brand-gold-300">
            Securiser mon compte (2FA)
          </Link>
          <form action={doSignOut}>
            <button className="mt-2 text-brand-gold-400 hover:text-brand-gold-300" type="submit">
              Se deconnecter
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 print:hidden">
          <div className="flex items-center gap-2">
            <MobileSidebar
              items={items}
              userName={session.user.name}
              roleLabel={ROLE_LABELS[session.user.role]}
              signOutAction={doSignOut}
            />
            <div className="flex items-center gap-2 md:hidden">
              <Image src="/brand/logo-mark.png" alt="Kawsara" width={42} height={36} className="h-9 w-auto" />
              <span className="font-bold text-brand-green-900">Kawsara ERP</span>
            </div>
          </div>
          <div className="ml-auto">
            <NotificationsBell />
          </div>
        </header>
        <main className="animate-fade-in flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
