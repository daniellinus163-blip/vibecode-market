"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type WishlistState = {
  ids: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) => {
        const ids = new Set(get().ids);
        if (ids.has(id)) ids.delete(id);
        else ids.add(id);
        set({ ids: Array.from(ids) });
      },
      has: (id) => get().ids.includes(id),
    }),
    { name: "vibecode_wishlist_v1" }
  )
);

