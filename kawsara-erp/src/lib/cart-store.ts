"use client";

import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: string;
  reference: string;
  name: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string | null;
  maxQuantity?: number;
};

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            const nextQty = existing.maxQuantity
              ? Math.min(existing.quantity + quantity, existing.maxQuantity)
              : existing.quantity + quantity;
            return {
              items: state.items.map((i) =>
                i.productId === item.productId ? { ...i, quantity: nextQty } : i
              ),
            };
          }
          const qty = item.maxQuantity ? Math.min(quantity, item.maxQuantity) : quantity;
          return { items: [...state.items, { ...item, quantity: Math.max(1, qty) }] };
        }),
      setQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              i.productId === productId
                ? { ...i, quantity: i.maxQuantity ? Math.min(quantity, i.maxQuantity) : quantity }
                : i
            )
            .filter((i) => i.quantity > 0),
        })),
      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),
      clear: () => set({ items: [] }),
    }),
    // Le panier vit dans localStorage : on ne le relit qu'apres le montage (voir useCartHydration),
    // sinon le premier rendu client differe du rendu serveur (erreur d'hydratation React).
    { name: "kawsara-cart", skipHydration: true }
  )
);

/** A monter une fois (layout racine) : recharge le panier depuis localStorage cote client. */
export function useCartHydration() {
  useEffect(() => {
    void useCartStore.persist.rehydrate();
  }, []);
}

/** true une fois le panier recharge depuis localStorage (toujours false cote serveur). */
export function useCartHydrated() {
  return useSyncExternalStore(
    (onChange) => useCartStore.persist.onFinishHydration(onChange),
    () => useCartStore.persist.hasHydrated(),
    () => false
  );
}

export function cartTotal(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}

export function cartCount(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
