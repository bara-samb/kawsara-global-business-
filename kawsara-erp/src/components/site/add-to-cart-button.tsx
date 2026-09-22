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
        unitPrice: product.sellingPrice,
        imageUrl: product.imageUrl,
        maxQuantity: product.availableStock,
      },
      quantity
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={outOfStock}
      className={
        className ??
        `flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-300 ${
          added ? "bg-brand-gold-500 text-brand-green-900" : "bg-brand-green-700 hover:bg-brand-green-800"
        }`
      }
    >
      {outOfStock ? (
        <>
          <PackageX className="h-4 w-4" />
          Rupture de stock
        </>
      ) : added ? (
        <>
          <Check className="animate-pop h-4 w-4" />
          Ajoute au panier
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4" />
          Ajouter au panier
        </>
      )}
    </button>
  );
}
