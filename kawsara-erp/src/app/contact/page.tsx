import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";

const CONTACTS = [
  { label: "Telephone / WhatsApp", value: "+221 77 743 29 49" },
  { label: "Email", value: "kawsaraglobalbusiness@gmail.com" },
  { label: "Adresse", value: "Touba, Senegal" },
];

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <h1 className="text-2xl font-bold text-brand-green-900">Contact</h1>
          <p className="mt-2 text-sm text-gray-600">
            Une question sur un produit, une commande ou votre facture ? Contactez-nous.
          </p>
          <dl className="mt-8 space-y-4 rounded-xl border border-brand-green-100 bg-brand-green-50 p-6">
            {CONTACTS.map((c) => (
              <div key={c.label} className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="text-sm font-semibold text-brand-green-900">{c.label}</dt>
                <dd className="text-sm text-gray-700">{c.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
