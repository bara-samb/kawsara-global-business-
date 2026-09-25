"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Ecran d'erreur partage par les fichiers error.tsx. En production, Next.js masque le message
 * des erreurs levees cote serveur (Server Actions comprises) : on affiche alors un message
 * generique qui liste les causes les plus frequentes plutot que l'ecran brut de Next.js.
 */
export function ErrorPanel({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const showMessage = process.env.NODE_ENV !== "production" || !error.digest;

  return (
    <div className="mx-auto my-10 max-w-lg rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm">
      <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
      <h2 className="mt-3 text-lg font-bold text-brand-green-900">L&apos;operation n&apos;a pas pu aboutir</h2>
      {showMessage && error.message ? (
        <p className="mt-2 text-sm text-red-700">{error.message}</p>
      ) : (
        <p className="mt-2 text-sm text-gray-600">
          Verifiez les informations saisies (stock disponible, caisse ouverte, champs obligatoires) puis reessayez.
        </p>
      )}
      {error.digest && <p className="mt-2 font-mono text-[10px] text-gray-400">Code : {error.digest}</p>}
      <button
        type="button"
        onClick={() => retry()}
        className="mt-5 inline-flex items-center gap-2 rounded-md bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-800"
      >
        <RotateCcw className="h-4 w-4" />
        Reessayer
      </button>
    </div>
  );
}
