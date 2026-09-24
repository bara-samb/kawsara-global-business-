import Link from "next/link";

export default async function CommandeConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference } = await searchParams;

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-brand-green-900">Commande envoyée</h1>
        <p className="mt-3 text-sm text-gray-600">
          Votre commande a été transmise au gérant pour préparation de la facture.
        </p>
        {reference && <p className="mt-4 font-mono text-lg font-semibold text-brand-green-700">Référence : {reference}</p>}
        <Link href="/catalogue" className="mt-8 inline-block rounded-md bg-brand-green-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-green-800">
          Retourner à la boutique
        </Link>
      </div>
    </main>
  );
}
