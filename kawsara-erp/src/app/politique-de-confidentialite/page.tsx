import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";

export default function PolitiqueConfidentialitePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <h1 className="text-2xl font-bold text-brand-green-900">Politique de confidentialite</h1>
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-gray-600">
            <p>
              Les informations que vous nous communiquez (nom, telephone, adresse) servent
              uniquement a traiter vos commandes et a assurer le suivi de votre compte client.
            </p>
            <p>
              Vos donnees sont stockees sur nos serveurs et ne sont jamais transmises a des tiers
              a des fins commerciales.
            </p>
            <p>
              Toute connexion a votre compte est journalisee pour des raisons de securite
              (protection contre les acces non autorises).
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
