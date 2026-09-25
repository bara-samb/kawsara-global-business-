"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Trash2, ArrowRight, ArrowLeft } from "lucide-react";
import { useCartStore, useCartHydrated, cartTotal } from "@/lib/cart-store";

export function PanierView() {
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const total = cartTotal(items);
  const hydrated = useCartHydrated();

  if (!hydrated) {
    return <p className="mt-8 text-sm text-gray-400">Chargement du panier...</p>;
  }

  if (items.length === 0) {
    return (
      <div className="animate-fade-in mt-8 flex flex-col items-center gap-3 rounded-xl border border-dashed border-brand-green-200 bg-white p-10 text-center">
        <ShoppingCart className="h-10 w-10 text-gray-300" />
        <p className="text-sm text-gray-500">Votre panier est vide.</p>
        <Link href="/catalogue" className="mt-2 inline-block rounded-md bg-brand-green-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-green-800 active:scale-95">
          Voir le catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-3">
        {items.map((item, i) => (
          <div
            key={item.productId}
            style={{ animationDelay: `${i * 40}ms` }}
            className="animate-fade-in-up flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-sm"
          >
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-green-50">
              {item.imageUrl ? (
                <Image src={item.imageUrl} alt={item.name} width={64} height={64} className="h-full w-full object-cover" />
              ) : (
                <span className="text-[10px] text-gray-400">Sans image</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate font-semibold text-brand-green-900">{item.name}</p>
              <p className="text-xs text-gray-400">{item.reference}</p>
              <p className="mt-1 text-sm font-semibold text-brand-green-800">
                {item.unitPrice.toLocaleString("fr-FR")} FCFA
              </p>
            </div>
            <input
              type="number"
              min={1}
              max={item.maxQuantity}
              value={item.quantity}
              onChange={(e) => {
                // Champ vide pendant la saisie : on ne retire pas l'article (bouton poubelle pour ca).
                const quantity = Math.floor(Number(e.target.value));
                if (quantity >= 1) setQuantity(item.productId, quantity);
              }}
              className="w-16 rounded-md border border-gray-300 px-2 py-1.5 text-sm transition focus:border-brand-green-500 focus:outline-none focus:ring-2 focus:ring-brand-green-100"
            />
            <p className="w-24 text-right font-semibold text-brand-green-900">
              {(item.unitPrice * item.quantity).toLocaleString("fr-FR")}
            </p>
            <button
              type="button"
              onClick={() => removeItem(item.productId)}
              aria-label="Retirer du panier"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-red-500 transition hover:bg-red-50 hover:text-red-700 active:scale-90"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="h-fit rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-sm font-semibold text-brand-green-900">Recapitulatif</p>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-500">Sous-total</span>
          <span className="font-semibold text-brand-green-900">{total.toLocaleString("fr-FR")} FCFA</span>
        </div>
        <p className="mt-1 text-xs text-gray-400">Livraison calculee lors de la validation.</p>
        <Link
          href="/commande"
          className="mt-5 flex items-center justify-center gap-2 rounded-md bg-brand-gold-500 px-4 py-2.5 text-center text-sm font-semibold text-brand-green-900 transition hover:bg-brand-gold-400 active:scale-95"
        >
          Passer la commande
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/catalogue" className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-brand-green-700 hover:text-brand-gold-600">
          <ArrowLeft className="h-3.5 w-3.5" />
          Continuer mes achats
        </Link>
      </div>
    </div>
  );
}
