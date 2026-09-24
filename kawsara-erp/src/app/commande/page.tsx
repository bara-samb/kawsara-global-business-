import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { CheckoutForm } from "@/components/site/checkout-form";

export default async function CommandePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <h1 className="text-2xl font-bold text-brand-green-900">Finaliser la commande</h1>
          <p className="mt-1 text-sm text-gray-500">
            Remplissez vos informations personnelles pour envoyer votre commande au gérant.
          </p>
          <div className="mt-8">
            <CheckoutForm />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
