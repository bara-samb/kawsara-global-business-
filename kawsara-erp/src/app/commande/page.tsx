import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { CheckoutForm } from "@/components/site/checkout-form";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function CommandePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/connexion?callbackUrl=/commande");
  }

  if (!can(session.user.role, "shop.order")) {
    return (
      <>
        <SiteHeader />
        <main className="flex-1">
          <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
            <h1 className="text-xl font-bold text-brand-green-900">Espace client uniquement</h1>
            <p className="mt-3 text-sm text-gray-500">
              Les commandes en ligne sont reservees aux comptes client. Vous etes connecte avec
              un compte de gestion (ERP).
            </p>
            <Link href="/erp" className="mt-6 inline-block rounded-md bg-brand-green-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-green-800">
              Aller a l&apos;espace gestion
            </Link>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const customer = session.user.customerId
    ? await prisma.customer.findUnique({ where: { id: session.user.customerId } })
    : null;

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <h1 className="text-2xl font-bold text-brand-green-900">Finaliser la commande</h1>
          <p className="mt-1 text-sm text-gray-500">
            Verifiez votre adresse de livraison et choisissez votre mode de paiement.
          </p>
          <div className="mt-8">
            <CheckoutForm defaultAddress={customer?.address ?? undefined} defaultPhone={customer?.phone ?? undefined} />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
