"use client";

import Link from "next/link";
import { cartCount, useCartStore } from "@/store/cartStore";

export function MobileBottomNav() {
  const count = cartCount(useCartStore((s) => s.items));
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/10 bg-white px-4 py-2 md:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-between">
        <Link href="/" className="text-sm font-medium text-black/80">Home</Link>
        <Link href="/shop" className="text-sm font-medium text-black/80">Shop</Link>
        <Link href="/cart" className="text-sm font-medium text-black/80" aria-label="Cart">
          🛒 {count > 0 ? `(${count})` : ""}
        </Link>
        <Link href="/settings" className="text-sm font-medium text-black/80">⚙</Link>
      </div>
    </nav>
  );
}

