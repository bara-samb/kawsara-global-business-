import Link from "next/link";
import {
  ArrowRight,
  Search,
  ShoppingCart,
  Send,
  Truck,
  Wallet,
  Smartphone,
  BadgeCheck,
  UserX,
  PackageSearch,
  Phone,
} from "lucide-react";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { AddToCartButton } from "@/components/site/add-to-cart-button";
import { ProductVisual } from "@/components/site/product-visual";
import { prisma } from "@/lib/prisma";

function availableStock(stocks: { quantity: number; reserved: number }[]) {
  return stocks.reduce((sum, s) => sum + Math.max(0, s.quantity - s.reserved), 0);
}

async function getHomeData() {
  try {
    const onlineProduct = { active: true, onlineEnabled: true };
    const [products, categories] = await Promise.all([
      prisma.product.findMany({
        where: onlineProduct,
        take: 8,
        orderBy: { createdAt: "desc" },
        include: { category: true, images: { take: 1, orderBy: { position: "asc" } }, stocks: true },
      }),
      prisma.category.findMany({
        where: { products: { some: onlineProduct } },
        orderBy: { name: "asc" },
        include: {
          _count: { select: { products: { where: onlineProduct } } },
          // Le visuel du rayon est celui de son premier produit illustre.
          products: {
            where: { ...onlineProduct, images: { some: {} } },
            take: 1,
            select: { images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } },
          },
        },
      }),
    ]);
    return { products, categories };
  } catch {
    return { products: [], categories: [] };
  }
}

// Uniquement des engagements reels de la boutique (voir le tunnel de commande et l'ERP).
const BENEFITS = [
  { icon: UserX, title: "Sans inscription", text: "Commandez avec votre nom et votre telephone, c'est tout." },
  { icon: Truck, title: "Livraison a domicile", text: "Votre commande est preparee puis livree a l'adresse indiquee." },
  { icon: Smartphone, title: "Wave & Orange Money", text: "Payez par mobile money, en especes a la livraison ou par virement." },
  { icon: BadgeCheck, title: "Stock verifie", text: "Seuls les produits reellement disponibles peuvent etre commandes." },
];

const STEPS = [
  { icon: ShoppingCart, title: "Choisissez vos produits", text: "Parcourez les rayons et ajoutez les articles a votre panier." },
  { icon: Send, title: "Envoyez votre commande", text: "Indiquez votre nom, telephone et adresse de livraison. Aucun compte a creer." },
  { icon: Wallet, title: "Recevez et payez", text: "Nous confirmons, preparons et livrons. Vous reglez selon le mode choisi." },
];

export default async function HomePage() {
  const { products, categories } = await getHomeData();
  const heroTiles = categories.slice(0, 4);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* ---------- Bandeau d'accueil ---------- */}
        <section className="relative overflow-hidden bg-brand-green-900 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)", backgroundSize: "22px 22px" }}
          />
          <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-gold-500/20 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-brand-green-500/30 blur-3xl" />

          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1.1fr_1fr]">
            <div className="animate-fade-in-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-gold-400/40 bg-brand-gold-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-gold-400">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-gold-400" />
                Quincaillerie &amp; materiaux
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
                Tout pour vos travaux,{" "}
                <span className="bg-gradient-to-r from-brand-gold-400 to-brand-gold-500 bg-clip-text text-transparent">
                  livre chez vous
                </span>
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-brand-green-100">
                Outillage, plomberie, electricite, peinture et quincaillerie generale.
                Commandez en ligne en quelques minutes, sans creer de compte.
              </p>

              <form action="/catalogue" role="search" className="mt-8 flex max-w-lg items-center gap-2 rounded-xl bg-white p-1.5 shadow-2xl shadow-black/20">
                <Search className="ml-2.5 h-5 w-5 shrink-0 text-gray-400" aria-hidden />
                <label htmlFor="home-search" className="sr-only">Rechercher un produit</label>
                <input
                  id="home-search"
                  name="q"
                  placeholder="Ciment, perceuse, robinet..."
                  className="min-w-0 flex-1 bg-transparent py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                />
                <button className="shrink-0 rounded-lg bg-brand-gold-500 px-4 py-2.5 text-sm font-bold text-brand-green-900 transition hover:bg-brand-gold-400 active:scale-95">
                  Rechercher
                </button>
              </form>

              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-brand-green-100">
                <Link href="/catalogue" className="group inline-flex items-center gap-1.5 font-semibold text-white hover:text-brand-gold-400">
                  Voir tout le catalogue
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <span className="inline-flex items-center gap-1.5">
                  <BadgeCheck className="h-4 w-4 text-brand-gold-400" aria-hidden />
                  Paiement a la livraison
                </span>
              </div>
            </div>

            {heroTiles.length > 0 && (
              <div className="animate-scale-in relative mx-auto w-full max-w-md lg:max-w-none">
                <div className="grid grid-cols-2 gap-4">
                  {heroTiles.map((c, i) => {
                    const image = c.products[0]?.images[0]?.url;
                    return (
                      <Link
                        key={c.id}
                        href={`/catalogue?categorie=${c.id}`}
                        className={`group relative aspect-[4/3] overflow-hidden rounded-2xl shadow-xl ring-1 ring-white/10 transition duration-300 hover:ring-2 hover:ring-brand-gold-400 ${i % 2 === 1 ? "translate-y-6" : ""}`}
                      >
                        <ProductVisual src={image} alt="" sizes="(min-width: 1024px) 260px, 45vw" zoomOnHover />
                        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-brand-green-900 shadow">
                          {c.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ---------- Engagements ---------- */}
        <section className="border-b border-brand-green-100 bg-white">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gold-100 text-brand-gold-700">
                  <b.icon className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-bold text-brand-green-900">{b.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{b.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Rayons ---------- */}
        {categories.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-gold-600">Nos rayons</p>
                <h2 className="mt-1 text-2xl font-extrabold text-brand-green-900 sm:text-3xl">Trouvez ce qu&apos;il vous faut</h2>
              </div>
              <Link href="/catalogue" className="group inline-flex items-center gap-1 text-sm font-semibold text-brand-green-700 hover:text-brand-gold-600">
                Tout le catalogue
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {categories.map((c) => {
                const image = c.products[0]?.images[0]?.url;
                return (
                  <Link
                    key={c.id}
                    href={`/catalogue?categorie=${c.id}`}
                    className="group overflow-hidden rounded-2xl border border-brand-green-100 bg-white transition duration-200 hover:-translate-y-1 hover:border-brand-gold-400 hover:shadow-lg"
                  >
                    <div className="relative aspect-[4/3] bg-brand-green-50">
                      <ProductVisual src={image} alt="" sizes="(min-width: 1024px) 220px, 45vw" zoomOnHover />
                    </div>
                    <div className="flex items-center justify-between gap-2 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-brand-green-900">{c.name}</p>
                        <p className="text-xs text-gray-500">
                          {c._count.products} produit{c._count.products > 1 ? "s" : ""}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-brand-gold-600" aria-hidden />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ---------- Produits en vedette ---------- */}
        <section className="bg-brand-green-50 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-gold-600">Nouveautes</p>
                <h2 className="mt-1 text-2xl font-extrabold text-brand-green-900 sm:text-3xl">Produits en vedette</h2>
              </div>
              <Link href="/catalogue" className="group inline-flex items-center gap-1 text-sm font-semibold text-brand-green-700 hover:text-brand-gold-600">
                Voir plus
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {products.length === 0 ? (
              <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-brand-green-100 bg-white p-10 text-center">
                <PackageSearch className="h-10 w-10 text-gray-300" aria-hidden />
                <p className="text-sm text-gray-500">Nos produits arrivent tres bientot. Revenez nous voir !</p>
              </div>
            ) : (
              <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
                {products.map((p) => {
                  const stock = availableStock(p.stocks);
                  return (
                    <div
                      key={p.id}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-brand-green-100 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl"
                    >
                      <Link href={`/catalogue/${p.id}`} className="relative block aspect-[4/3] bg-brand-green-50">
                        <ProductVisual src={p.images[0]?.url} alt={p.name} sizes="(min-width: 1024px) 270px, 50vw" zoomOnHover />
                        <span
                          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm ${
                            stock > 0 ? "bg-white/95 text-brand-green-700" : "bg-red-600 text-white"
                          }`}
                        >
                          {stock > 0 ? "En stock" : "Rupture"}
                        </span>
                      </Link>
                      <div className="flex flex-1 flex-col p-3 sm:p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-brand-gold-600">
                          {p.category?.name ?? "Divers"}
                        </p>
                        <Link href={`/catalogue/${p.id}`} className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-brand-green-900 hover:text-brand-gold-600 sm:text-base">
                          {p.name}
                        </Link>
                        <p className="mt-auto pt-3 text-base font-extrabold text-brand-green-800 sm:text-lg">
                          {p.sellingPrice.toLocaleString("fr-FR")} <span className="text-sm font-bold">FCFA</span>
                        </p>
                        <div className="mt-3">
                          <AddToCartButton
                            product={{
                              id: p.id,
                              reference: p.reference,
                              name: p.name,
                              description: p.description,
                              sellingPrice: p.sellingPrice,
                              imageUrl: p.images[0]?.url,
                              availableStock: stock,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ---------- Comment commander ---------- */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-gold-600">Simple et rapide</p>
            <h2 className="mt-1 text-2xl font-extrabold text-brand-green-900 sm:text-3xl">Comment commander ?</h2>
          </div>
          <div className="relative mt-12">
            <div aria-hidden className="absolute left-[16%] right-[16%] top-7 hidden border-t-2 border-dashed border-brand-green-100 md:block" />
            <ol className="relative grid gap-10 md:grid-cols-3 md:gap-6">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative flex flex-col items-center text-center">
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-green-700 text-white shadow-lg shadow-brand-green-700/30">
                    <s.icon className="h-6 w-6" aria-hidden />
                    <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-gold-500 text-xs font-extrabold text-brand-green-900 ring-4 ring-white">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 font-bold text-brand-green-900">{s.title}</h3>
                  <p className="mt-1 max-w-xs text-sm leading-relaxed text-gray-600">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="mt-12 flex justify-center">
            <Link
              href="/catalogue"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-green-700 px-6 py-3 font-bold text-white shadow-lg shadow-brand-green-700/20 transition hover:bg-brand-green-800 active:scale-95"
            >
              <ShoppingCart className="h-5 w-5" aria-hidden />
              Commencer mes achats
            </Link>
          </div>
        </section>

        {/* ---------- Contact ---------- */}
        <section className="px-4 pb-16 sm:px-6">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand-gold-500 to-brand-gold-400 px-6 py-10 sm:px-12">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/20 blur-2xl" />
            <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-extrabold text-brand-green-900">Besoin d&apos;un conseil ou d&apos;un devis ?</h2>
                <p className="mt-1 max-w-xl text-brand-green-900/80">
                  Grosse quantite, produit introuvable, question technique : notre equipe vous repond.
                </p>
              </div>
              <Link
                href="/contact"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-green-900 px-6 py-3 font-bold text-white transition hover:bg-brand-green-800 active:scale-95"
              >
                <Phone className="h-5 w-5" aria-hidden />
                Nous contacter
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
