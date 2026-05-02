"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: string;
  title: string;
  image: string;
  variantLabel: string;
  unitPriceCents: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  remove: (productId: string, variantLabel: string) => void;
  setQty: (productId: string, variantLabel: string, quantity: number) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item, quantity = 1) => {
        const items = [...get().items];
        const idx = items.findIndex((x) => x.productId === item.productId && x.variantLabel === item.variantLabel);
        if (idx >= 0) items[idx] = { ...items[idx], quantity: items[idx].quantity + quantity };
        else items.push({ ...item, quantity });
        set({ items });
      },
      remove: (productId, variantLabel) =>
        set({ items: get().items.filter((x) => !(x.productId === productId && x.variantLabel === variantLabel)) }),
      setQty: (productId, variantLabel, quantity) => {
        const q = Math.max(1, Math.min(20, quantity));
        set({
          items: get().items.map((x) =>
            x.productId === productId && x.variantLabel === variantLabel ? { ...x, quantity: q } : x
          ),
        });
      },
      clear: () => set({ items: [] }),
    }),
    { name: "vibecode_cart_v1" }
  )
);

export function cartCount(items: CartItem[]) {
  return items.reduce((sum, x) => sum + x.quantity, 0);
}

