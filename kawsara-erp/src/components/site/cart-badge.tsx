"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCartStore, cartCount } from "@/lib/cart-store";

export function CartBadge() {
  const items = useCartStore((s) => s.items);
  const count = cartCount(items);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const previousCount = useRef(count);

  useEffect(() => {
    if (count > previousCount.current && badgeRef.current) {
      badgeRef.current.classList.remove("animate-pop");
      // Force reflow pour pouvoir rejouer l'animation meme si la classe etait deja presente.
      void badgeRef.current.offsetWidth;
      badgeRef.current.classList.add("animate-pop");
    }
    previousCount.current = count;
  }, [count]);

  return (
    <Link
      href="/panier"
      className="relative flex items-center gap-1.5 rounded-md border border-brand-green-700 px-3 py-1.5 text-sm font-semibold text-brand-green-700 transition hover:bg-brand-green-50 active:scale-95"
    >
      <ShoppingCart className="h-4 w-4" />
      <span className="hidden sm:inline">Panier</span>
      {count > 0 && (
        <span
          ref={badgeRef}
          className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-gold-500 text-[10px] font-bold text-brand-green-900"
        >
          {count}
        </span>
      )}
    </Link>
  );
}
