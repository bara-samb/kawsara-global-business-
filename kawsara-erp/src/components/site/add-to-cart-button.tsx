"use client";

import { useState } from "react";
import { ShoppingCart, Check, PackageX } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";

export function AddToCartButton({
  product,
  quantity = 1,
  className,
}: {
  product: {
    id: string;
    reference: string;
    name: string;
    description?: string | null;
    sellingPrice: number;
    imageUrl?: string | null;
    availableStock: number;
  };
  quantity?: number;
  className?: string;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);

  const outOfStock = product.availableStock <= 0;

  function handleClick() {
    if (outOfStock) return;
    addItem(
      {
        productId: product.id,
        reference: product.reference,
        name: product.name,
        description: product.description,
        unitPrice: product.sellingPrice,
        imageUrl: product.imageUrl,
        maxQuantity: product.availableStock,
      },
      quantity
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  // Libelle court dans les cartes etroites (2 colonnes sur mobile) : la fin du texte ne s'affiche
  // que si le bouton a la place (requete de conteneur), sinon il debordait de la carte.
  const button = (
    <button
      type="button"
      onClick={handleClick}
      disabled={outOfStock}
      className={
        className ??
        `flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 py-2 text-sm font-semibold text-white transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-300 @[11rem]:px-4 ${
          added ? "bg-brand-gold-500 text-brand-green-900" : "bg-brand-green-700 hover:bg-brand-green-800"
        }`
      }
    >
      {outOfStock ? (
        <>
          <PackageX className="h-4 w-4 shrink-0" />
          Rupture<span className="hidden @[11rem]:inline">&nbsp;de stock</span>
        </>
      ) : added ? (
        <>
          <Check className="animate-pop h-4 w-4 shrink-0" />
          Ajouté<span className="hidden @[11rem]:inline">&nbsp;au panier</span>
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4 shrink-0" />
          Ajouter<span className="hidden @[11rem]:inline">&nbsp;au panier</span>
        </>
      )}
    </button>
  );

  return className ? button : <div className="@container">{button}</div>;
}
