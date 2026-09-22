import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";

export default function AProposPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <h1 className="text-2xl font-bold text-brand-green-900">A propos de Kawsara Global Business</h1>
          <p className="mt-4 text-sm leading-relaxed text-gray-600">
            Kawsara Global Business est une entreprise de quincaillerie generale (import-export)
            basee au Senegal. Nous proposons materiaux de construction, outillage, peinture,
            plomberie et electricite aussi bien en boutique physique qu&apos;en ligne.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-gray-600">
            Cette plateforme reunit notre gestion commerciale (stock, ventes, factures) et notre
            boutique en ligne dans un seul outil, pour garantir a nos clients des informations de
            stock et de prix toujours a jour.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
