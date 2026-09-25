"use client";

import { useCartHydration } from "@/lib/cart-store";

export function CartHydration() {
  useCartHydration();
  return null;
}
