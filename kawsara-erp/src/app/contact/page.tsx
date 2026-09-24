import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, Mail, MapPin, MessageCircleQuestion, Phone } from "lucide-react";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { WhatsAppContactForm } from "@/components/site/whatsapp-contact-form";
import {
  CONTACT_ADDRESS,
  CONTACT_EMAIL,
  CONTACT_MAPS_URL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_HREF,
  whatsappUrl,
} from "@/lib/site-contact";

export const metadata: Metadata = {
  title: "Contact - Kawsara Global Business",
  description: `Contactez Kawsara Global Business par WhatsApp, telephone ou email. ${CONTACT_ADDRESS}.`,
};

// Reponses fondees uniquement sur le fonctionnement reel de la boutique.
const FAQ = [
  {
    q: "Dois-je creer un compte pour commander ?",
    a: "Non. Ajoutez vos produits au panier puis indiquez simplement votre nom, votre telephone et votre adresse de livraison.",
  },
  {
    q: "Quels moyens de paiement acceptez-vous ?",
    a: "Especes a la livraison, Wave, Orange Money et virement bancaire. Vous choisissez le mode de paiement au moment de la commande.",
  },
  {
    q: "Comment suivre ma commande ?",
    a: "Une reference (par exemple CMD-2026-000012) s'affiche a la fin de votre commande. Envoyez-nous cette reference par WhatsApp ou par telephone et nous vous indiquons ou elle en est.",
  },
  {
    q: "Puis-je commander en grande quantite ou demander un devis ?",
    a: "Oui. Pour un chantier ou une commande en gros, ecrivez-nous avec la liste des produits et les quantites : nous vous preparons un devis.",
  },
  {
    q: "Un produit est en rupture de stock, que faire ?",
    a: "Contactez-nous : nous vous indiquons quand il sera de nouveau disponible ou nous vous proposons un produit equivalent.",
  },
];

export default function ContactPage() {
  const channels = [
    {
      icon: <WhatsAppIcon className="h-6 w-6" />,
      title: "WhatsApp",
      value: CONTACT_PHONE_DISPLAY,
      hint: "Le plus rapide : ecrivez-nous",
      href: whatsappUrl("Bonjour Kawsara Global Business, "),
      external: true,
      accent: "bg-[#25D366]/10 ring-[#25D366]/30",
    },
    {
      icon: <Phone className="h-6 w-6 text-brand-green-700" aria-hidden />,
      title: "Telephone",
      value: CONTACT_PHONE_DISPLAY,
      hint: "Appelez-nous directement",
      href: CONTACT_PHONE_HREF,
      external: false,
      accent: "bg-brand-green-100 ring-brand-green-600/20",
    },
    {
      icon: <Mail className="h-6 w-6 text-brand-gold-700" aria-hidden />,
      title: "Email",
      value: CONTACT_EMAIL,
      hint: "Pour les devis et documents",
      href: `mailto:${CONTACT_EMAIL}`,
      external: false,
      accent: "bg-brand-gold-100 ring-brand-gold-500/30",
    },
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
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full bg-brand-gold-500/20 blur-3xl" />
          <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-14 sm:px-6 md:pt-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-gold-400/40 bg-brand-gold-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-gold-400">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-gold-400" />
              Contact
            </span>
            <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              Parlons de votre{" "}
              <span className="bg-gradient-to-r from-brand-gold-400 to-brand-gold-500 bg-clip-text text-transparent">projet</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-brand-green-100">
              Une question sur un produit, un devis ou votre commande ? Notre equipe vous repond.
            </p>
          </div>
        </section>

        {/* ---------- Canaux de contact ---------- */}
        <section className="relative z-10 mx-auto -mt-14 max-w-6xl px-4 sm:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            {channels.map((c) => (
              <a
                key={c.title}
                href={c.href}
                {...(c.external ? { target: "_blank", rel: "noreferrer" } : {})}
                className="group flex items-center gap-4 rounded-2xl border border-brand-green-100 bg-white p-5 shadow-lg transition duration-200 hover:-translate-y-1 hover:border-brand-gold-400 hover:shadow-xl"
              >
                <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-1 ${c.accent}`}>{c.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold uppercase tracking-wider text-gray-400">{c.title}</span>
                  <span className="block break-all font-bold text-brand-green-900 [overflow-wrap:anywhere] md:text-sm lg:text-base">{c.value}</span>
                  <span className="block text-xs text-gray-500">{c.hint}</span>
                </span>
                <ArrowUpRight className="h-5 w-5 shrink-0 text-gray-300 transition group-hover:text-brand-gold-600" aria-hidden />
              </a>
            ))}
          </div>
        </section>

        {/* ---------- Formulaire + adresse ---------- */}
        <section className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl border border-brand-green-100 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-gold-600">Ecrivez-nous</p>
            <h2 className="mt-1 text-2xl font-extrabold text-brand-green-900">Envoyez-nous un message</h2>
            <p className="mb-6 mt-1 text-sm text-gray-500">Remplissez le formulaire, il s&apos;ouvrira directement dans WhatsApp.</p>
            <WhatsAppContactForm />
          </div>

          <div className="flex flex-col gap-6">
            <div className="relative overflow-hidden rounded-3xl bg-brand-green-900 p-6 text-white sm:p-8">
              <div aria-hidden className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-brand-gold-500/25 blur-2xl" />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.08]"
                style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)", backgroundSize: "18px 18px" }}
              />
              <div className="relative">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gold-500 text-brand-green-900">
                  <MapPin className="h-6 w-6" aria-hidden />
                </span>
                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-brand-gold-400">Notre adresse</p>
                <p className="mt-1 text-2xl font-extrabold">{CONTACT_ADDRESS}</p>
                <a
                  href={CONTACT_MAPS_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/30 px-4 py-2.5 text-sm font-bold transition hover:bg-white/10"
                >
                  Voir sur Google Maps
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </a>
              </div>
            </div>

            <div className="rounded-3xl border border-brand-gold-400/40 bg-brand-gold-50 p-6 sm:p-8">
              <p className="font-bold text-brand-green-900">Vous preferez commander directement ?</p>
              <p className="mt-1 text-sm text-gray-600">
                Tout notre catalogue est disponible en ligne, sans inscription.
              </p>
              <Link
                href="/catalogue"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-green-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-green-800 active:scale-95"
              >
                Voir le catalogue
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        {/* ---------- Questions frequentes ---------- */}
        <section className="bg-brand-green-50 py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <div className="text-center">
              <MessageCircleQuestion className="mx-auto h-8 w-8 text-brand-gold-600" aria-hidden />
              <h2 className="mt-2 text-2xl font-extrabold text-brand-green-900 sm:text-3xl">Questions frequentes</h2>
            </div>
            <div className="mt-8 space-y-3">
              {FAQ.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl border border-brand-green-100 bg-white p-5 shadow-sm open:shadow-md"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-brand-green-900 [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <ChevronDown className="h-5 w-5 shrink-0 text-brand-gold-600 transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
