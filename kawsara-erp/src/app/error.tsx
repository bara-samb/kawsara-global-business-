"use client";

import { useEffect } from "react";
import Link from "next/link";

// Ecran affiche a la place de la page technique de Next.js quand une erreur inattendue survient.
// Le message technique n'est jamais montre : seule la reference permet de retrouver l'erreur
// dans les journaux du serveur.
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-brand-green-900">Oups, quelque chose s&apos;est mal passe</h1>
      <p className="mt-3 text-sm text-gray-600">
        La page n&apos;a pas pu s&apos;afficher correctement. Vos donnees n&apos;ont pas ete modifiees.
        Reessayez ; si le probleme persiste, contactez l&apos;administrateur.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-gray-400">Reference a communiquer : {error.digest}</p>
      )}
      <div className="mt-6 flex justify-center gap-3">
        <button
          onClick={() => retry()}
          className="rounded-md bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-800"
        >
          Reessayer
        </button>
        <Link
          href="/"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Retour a l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
