import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Globe2, MapPin, MessagesSquare, Store, Tags, Truck, Wallet } from "lucide-react";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { ProductVisual } from "@/components/site/product-visual";
import { prisma } from "@/lib/prisma";
import { CONTACT_ADDRESS, COMPANY_NINEA, COMPANY_RCCM, whatsappUrl } from "@/lib/site-contact";

export const metadata: Metadata = {
  title: "A propos - Kawsara Global Business",
  description: "Kawsara Global Business, quincaillerie generale et import-export au Senegal.",
};

// Chiffres lus en direct dans la base : jamais de statistique inventee.
async function getShopFacts() {
  try {
    const onlineProduct = { active: true, onlineEnabled: true };
    const [productCount, categories] = await Promise.all([
      prisma.product.count({ where: onlineProduct }),
      prisma.category.findMany({
        where: { products: { some: onlineProduct } },
        orderBy: { name: "asc" },
        include: {
          _count: { select: { products: { where: onlineProduct } } },
          products: {
            where: { ...onlineProduct, images: { some: {} } },
            take: 1,
            select: { images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } },
          },
        },
      }),
    ]);
    return { productCount, categories };
  } catch {
    return { productCount: 0, categories: [] };
  }
}

const COMMITMENTS = [
  {
    icon: Tags,
    title: "Des prix clairs",
    text: "Chaque prix est affiche en FCFA sur la boutique. Pas de surprise au moment de payer.",
  },
  {
    icon: BadgeCheck,
    title: "Un stock a jour",
    text: "La boutique en ligne et nos magasins partagent le meme stock : ce qui est affiche est disponible.",
  },
  {
    icon: Truck,
    title: "Livraison a domicile",
    text: "Votre commande est preparee dans notre depot puis livree a l'adresse que vous indiquez.",
  },
  {
    icon: Wallet,
    title: "Paiement comme vous voulez",
    text: "Especes a la livraison, Wave, Orange Money ou virement bancaire : vous choisissez en commandant.",
  },
];

export default async function AProposPage() {
  const { productCount, categories } = await getShopFacts();

  const facts = [
    { icon: Globe2, value: "Import - Export", label: "Quincaillerie generale" },
    { icon: MapPin, value: CONTACT_ADDRESS.split(",")[0], label: "Base au Senegal" },
    { icon: Store, value: `${categories.length} rayons`, label: "Du gros oeuvre a la finition" },
    { icon: BadgeCheck, value: `${productCount} produits`, label: "Disponibles en ligne" },
  ];

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* ---------- En-tete ---------- */}
        <section className="relative overflow-hidden bg-brand-green-900 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)", backgroundSize: "22px 22px" }}
          />
          <div aria-hidden className="pointer-events-none absolute -left-24 -top-32 h-96 w-96 rounded-full bg-brand-gold-500/20 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-brand-green-500/30 blur-3xl" />

          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1.2fr_1fr]">
            <div className="animate-fade-in-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-gold-400/40 bg-brand-gold-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-gold-400">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-gold-400" />
                A propos de nous
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
                Votre partenaire{" "}
                <span className="bg-gradient-to-r from-brand-gold-400 to-brand-gold-500 bg-clip-text text-transparent">
                  quincaillerie
                </span>{" "}
                au Senegal
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-brand-green-100">
                Kawsara Global Business fournit les particuliers, artisans et entreprises en
                materiaux de construction, outillage, plomberie, electricite et peinture, en
                magasin comme en ligne.
              </p>
            </div>

            <div className="animate-scale-in flex justify-center lg:justify-end">
              <div className="relative">
                <div aria-hidden className="absolute -inset-4 rounded-[2rem] bg-brand-gold-400/20 blur-xl" />
                <div className="relative rounded-3xl bg-white p-8 shadow-2xl ring-1 ring-white/20 sm:p-10">
                  <Image src="/brand/logo-full.png" alt="Kawsara Global Business" width={590} height={497} className="h-auto w-56 sm:w-64" priority />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Chiffres cles ---------- */}
        <section className="relative z-10 mx-auto -mt-8 max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-brand-green-100 bg-brand-green-100 shadow-lg lg:grid-cols-4">
            {facts.map((f) => (
              <div key={f.label} className="flex items-center gap-3 bg-white p-4 sm:p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gold-100 text-brand-gold-700">
                  <f.icon className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-extrabold text-brand-green-900 sm:text-lg">{f.value}</p>
                  <p className="text-xs text-gray-500">{f.label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Notre histoire ---------- */}
        <section className="mx-auto grid max-w-6xl items-start gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-gold-600">Qui sommes-nous</p>
            <h2 className="mt-1 text-2xl font-extrabold text-brand-green-900 sm:text-3xl">
              Une quincaillerie generale, pres de chez vous
            </h2>
          </div>
          <div className="space-y-4 text-base leading-relaxed text-gray-600">
            <p>
              Kawsara Global Business est une entreprise senegalaise d&apos;import-export
              specialisee dans la quincaillerie generale. Nous selectionnons des produits
              fiables pour tous vos travaux : du ciment et du fer a beton pour le gros oeuvre,
              jusqu&apos;a la peinture et l&apos;electricite pour les finitions.
            </p>
            <p>
              Notre boutique en ligne est reliee directement a nos magasins : les prix et les
              quantites que vous voyez sont ceux de notre stock reel. Vous commandez en quelques
              minutes, sans creer de compte, et nous vous livrons.
            </p>
          </div>
        </section>

        {/* ---------- Nos rayons ---------- */}
        {categories.length > 0 && (
          <section className="bg-brand-green-50 py-16">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <p className="text-xs font-bold uppercase tracking-widest text-brand-gold-600">Ce que nous proposons</p>
              <h2 className="mt-1 text-2xl font-extrabold text-brand-green-900 sm:text-3xl">Nos rayons</h2>
              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/catalogue?categorie=${c.id}`}
                    className="group overflow-hidden rounded-2xl border border-brand-green-100 bg-white transition duration-200 hover:-translate-y-1 hover:border-brand-gold-400 hover:shadow-lg"
                  >
                    <div className="relative aspect-[4/3]">
                      <ProductVisual src={c.products[0]?.images[0]?.url} alt="" sizes="(min-width: 1024px) 220px, 45vw" zoomOnHover />
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-bold text-brand-green-900">{c.name}</p>
                      <p className="text-xs text-gray-500">
                        {c._count.products} produit{c._count.products > 1 ? "s" : ""}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---------- Engagements ---------- */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-gold-600">Nos engagements</p>
            <h2 className="mt-1 text-2xl font-extrabold text-brand-green-900 sm:text-3xl">Pourquoi nous faire confiance</h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {COMMITMENTS.map((c) => (
              <div
                key={c.title}
                className="rounded-2xl border border-brand-green-100 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green-700 text-white shadow-lg shadow-brand-green-700/25">
                  <c.icon className="h-6 w-6" aria-hidden />
                </div>
                <h3 className="mt-4 font-bold text-brand-green-900">{c.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">{c.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-brand-green-100 bg-white px-6 py-5 text-center sm:flex-row sm:justify-center sm:gap-6">
            <span className="inline-flex items-center gap-2 text-sm font-bold text-brand-green-900">
              <BadgeCheck className="h-5 w-5 text-brand-gold-600" aria-hidden />
              Entreprise enregistree au Senegal
            </span>
            <span className="text-sm text-gray-600">
              RCCM : <span className="font-mono font-semibold text-gray-800">{COMPANY_RCCM}</span>
            </span>
            <span className="text-sm text-gray-600">
              NINEA : <span className="font-mono font-semibold text-gray-800">{COMPANY_NINEA}</span>
            </span>
          </div>
        </section>

        {/* ---------- Appel a l'action ---------- */}
        <section className="px-4 pb-16 sm:px-6">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-brand-green-900 px-6 py-12 text-white sm:px-12">
            <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-gold-500/25 blur-3xl" />
            <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-extrabold sm:text-3xl">Un projet, une question ?</h2>
                <p className="mt-2 max-w-md text-brand-green-100">
                  Parcourez notre catalogue ou ecrivez-nous directement : notre equipe vous
                  conseille et vous prepare un devis.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:shrink-0 lg:flex-nowrap">
                <Link
                  href="/catalogue"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-gold-500 px-5 py-3 font-bold text-brand-green-900 transition hover:bg-brand-gold-400 active:scale-95"
                >
                  Voir le catalogue
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <a
                  href={whatsappUrl("Bonjour Kawsara Global Business, j'ai une question.")}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-5 py-3 font-bold text-white transition hover:bg-white/10 active:scale-95"
                >
                  <WhatsAppIcon className="h-5 w-5" />
                  WhatsApp
                </a>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-5 py-3 font-bold text-white transition hover:bg-white/10 active:scale-95"
                >
                  <MessagesSquare className="h-5 w-5" aria-hidden />
                  Contact
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
