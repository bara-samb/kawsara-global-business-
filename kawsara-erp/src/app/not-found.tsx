import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-brand-green-900">Page introuvable</h1>
      <p className="mt-3 text-sm text-gray-600">
        La page ou l&apos;element demande n&apos;existe pas, ou a ete supprime.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-md bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-800"
      >
        Retour a l&apos;accueil
      </Link>
    </div>
  );
}
