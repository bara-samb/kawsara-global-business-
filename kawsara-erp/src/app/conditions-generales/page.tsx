import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";

export default function ConditionsGeneralesPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <h1 className="text-2xl font-bold text-brand-green-900">Conditions generales de vente</h1>
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-gray-600">
            <p>
              Les prix affiches sur la boutique en ligne sont exprimes en FCFA, toutes taxes
              comprises, et correspondent au stock disponible au moment de la commande.
            </p>
            <p>
              Une commande n&apos;est confirmee qu&apos;apres verification de la disponibilite du
              stock par nos equipes. En cas d&apos;indisponibilite partielle, le client est
              contacte avant preparation.
            </p>
            <p>
              Le paiement peut se faire a la livraison (especes) ou par mobile money (Wave,
              Orange Money) / virement bancaire, selon le mode choisi lors de la commande.
            </p>
            <p>
              Une facture est emise pour chaque commande livree et reste consultable depuis
              l&apos;espace client.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
