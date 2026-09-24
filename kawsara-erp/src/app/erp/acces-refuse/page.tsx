import Link from "next/link";
import { describeForbidden } from "@/lib/permissions";

export default async function AccesRefusePage({
  searchParams,
}: {
  searchParams: Promise<{ permission?: string }>;
}) {
  const { permission } = await searchParams;

  return (
    <div className="mx-auto max-w-lg py-12 text-center">
      <h1 className="text-xl font-bold text-brand-green-900">Acces refuse</h1>
      <p className="mt-3 text-sm text-gray-600">
        {describeForbidden(permission ?? "")}
      </p>
      <p className="mt-2 text-xs text-gray-400">
        Cette tentative a ete enregistree. Si vous pensez que c&apos;est une erreur, contactez l&apos;administrateur.
      </p>
      <Link
        href="/erp"
        className="mt-6 inline-block rounded-md bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-800"
      >
        Retour au tableau de bord
      </Link>
    </div>
  );
}
