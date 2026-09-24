"use client";

import { Download, Printer } from "lucide-react";

export function PrintButton({ label = "Imprimer" }: { label?: string } = {}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-2 rounded-md bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-green-800 active:scale-95 print:hidden"
    >
      {label === "Télécharger la facture PDF" ? <Download className="h-4 w-4" /> : <Printer className="h-4 w-4" />}
      {label}
    </button>
  );
}
