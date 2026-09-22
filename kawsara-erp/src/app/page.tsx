import Image from "next/image";
import Link from "next/link";
import { Store, LayoutDashboard, RefreshCw, Warehouse, Receipt, LineChart, ArrowRight, PackageSearch } from "lucide-react";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { prisma } from "@/lib/prisma";

async function getFeaturedProducts() {
  try {
    return await prisma.product.findMany({
      where: { active: true, onlineEnabled: true },
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { category: true, images: { take: 1, orderBy: { position: "asc" } } },
    });
  } catch {
    return [];
  }
}

const FEATURES = [
  {
    title: "Catalogue synchronise",
    description:
      "Un produit active dans l'ERP est visible automatiquement sur la boutique en ligne.",
    icon: RefreshCw,
  },
  {
    title: "Stock en temps reel",
    description:
      "Stock physique, reserve et disponible geres par boutique, avec alertes de seuil minimum.",
    icon: Warehouse,
  },
  {
    title: "Facturation & paiements",
    description:
      "Ventes, factures, paiements mixtes (especes, Wave, cheque) et suivi des dettes clients.",
    icon: Receipt,
  },
  {
    title: "Statistiques & rentabilite",
    description:
      "Chiffre d'affaires, marges, produits et clients les plus rentables, analyse des risques.",
    icon: LineChart,
  },
];

export default async function HomePage() {
  const products = await getFeaturedProducts();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-br from-brand-green-800 via-brand-green-700 to-brand-green-900 text-white">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
            <div className="animate-fade-in-up">
              <span className="inline-block rounded-full bg-brand-gold-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-gold-300">
                ERP + boutique en ligne
              </span>
              <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl">
                La gestion commerciale de{" "}
                <span className="text-brand-gold-400">Kawsara Global Business</span>
              </h1>
              <p className="mt-4 max-w-xl text-brand-green-100">
                Produits, stocks, clients, fournisseurs, ventes, factures, dettes et
                statistiques : une seule plateforme, du panier client jusqu&apos;a la
                rentabilite.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/catalogue"
                  className="flex items-center gap-2 rounded-md bg-brand-gold-500 px-5 py-2.5 font-semibold text-brand-green-900 transition hover:bg-brand-gold-400 hover:shadow-lg active:scale-95"
                >
                  <Store className="h-4 w-4" />
                  Voir le catalogue
                </Link>
                <Link
                  href="/connexion"
                  className="flex items-center gap-2 rounded-md border border-white/40 px-5 py-2.5 font-semibold text-white transition hover:bg-white/10 active:scale-95"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Espace gestion (ERP)
                </Link>
              </div>
            </div>
            <div className="animate-scale-in flex justify-center">
              <div className="rounded-2xl bg-white/95 p-6 shadow-xl transition-transform hover:scale-[1.02]">
                <Image
                  src="/logo-kawsara.jpg"
                  alt="Kawsara Global Business"
                  width={260}
                  height={260}
                  className="mx-auto"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-brand-green-900">
            Un cycle commercial complet et securise
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-gray-600">
            Produit ajoute dans l&apos;ERP → publie sur la boutique → commande client →
            preparation → facture → paiement → mise a jour du stock → statistiques.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                style={{ animationDelay: `${i * 60}ms` }}
                className="animate-fade-in-up rounded-xl border border-brand-green-100 bg-brand-green-50 p-5 transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-green-700 text-white">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-brand-green-900">{f.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-brand-green-50 py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-brand-green-900">Produits en vedette</h2>
              <Link href="/catalogue" className="group flex items-center gap-1 text-sm font-semibold text-brand-green-700 hover:text-brand-gold-600">
                Tout le catalogue
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {products.length === 0 ? (
              <div className="animate-fade-in mt-8 flex flex-col items-center gap-3 rounded-lg border border-dashed border-brand-green-200 bg-white p-10 text-center">
                <PackageSearch className="h-10 w-10 text-gray-300" />
                <p className="text-sm text-gray-500">
                  Aucun produit publie pour le moment. Les produits actives dans l&apos;ERP et
                  marques « vente en ligne » apparaitront automatiquement ici.
                </p>
              </div>
            ) : (
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {products.map((p) => (
                  <Link
                    key={p.id}
                    href={`/catalogue/${p.id}`}
                    className="group rounded-xl border border-brand-green-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="flex h-32 items-center justify-center overflow-hidden rounded-lg bg-brand-green-50">
                      {p.images[0] ? (
                        <Image
                          src={p.images[0].url}
                          alt={p.name}
                          width={160}
                          height={128}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">Pas d&apos;image</span>
                      )}
                    </div>
                    <p className="mt-3 text-xs font-medium uppercase tracking-wide text-brand-gold-600">
                      {p.category?.name ?? "Divers"}
                    </p>
                    <p className="font-semibold text-brand-green-900 group-hover:text-brand-gold-600">
                      {p.name}
                    </p>
                    <p className="mt-1 font-bold text-brand-green-800">
                      {p.sellingPrice.toLocaleString("fr-FR")} FCFA
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
