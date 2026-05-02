"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { useCartStore } from "@/store/cartStore";

function cents(c: number) {
  return (c / 100).toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const remove = useCartStore((s) => s.remove);
  const setQty = useCartStore((s) => s.setQty);

  const subtotal = useMemo(() => items.reduce((sum, x) => sum + x.unitPriceCents * x.quantity, 0), [items]);

  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 pt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs tracking-[0.3em] text-black/50">CART</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-primary md:text-4xl">Your selection</h1>
        </div>
        <Link
          href="/shop"
          className="rounded-full border border-black/10 bg-white px-5 py-2 text-sm font-medium text-black/75 transition hover:border-accent/60 hover:text-black"
        >
          Continue shopping
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-12">
        <div className="md:col-span-8">
          {items.length === 0 ? (
            <div className="rounded-[26px] border border-black/10 bg-white p-8 text-black/65 shadow-sm">
              Your cart is empty.
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((x) => (
                <motion.div
                  key={`${x.productId}:${x.variantLabel}`}
                  layout
                  className="flex gap-4 rounded-[26px] border border-black/10 bg-white p-4 shadow-sm"
                >
                  <div className="relative h-24 w-20 overflow-hidden rounded-[16px] border border-black/10">
                    <Image src={x.image} alt={x.title} fill className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold tracking-tight text-primary">{x.title}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.22em] text-black/45">
                          Variant: {x.variantLabel}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-primary">{cents(x.unitPriceCents * x.quantity)}</div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setQty(x.productId, x.variantLabel, x.quantity - 1)}
                        className="rounded-full border border-black/10 bg-white px-3 py-2 text-sm text-black/80 hover:border-accent/50"
                      >
                        −
                      </button>
                      <div className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-black/75">
                        {x.quantity}
                      </div>
                      <button
                        onClick={() => setQty(x.productId, x.variantLabel, x.quantity + 1)}
                        className="rounded-full border border-black/10 bg-white px-3 py-2 text-sm text-black/80 hover:border-accent/50"
                      >
                        +
                      </button>
                      <button
                        onClick={() => remove(x.productId, x.variantLabel)}
                        className="ml-auto rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-black/70 hover:border-accent/50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="md:col-span-4">
          <div className="sticky top-24 rounded-[26px] border border-black/10 bg-white p-6 shadow-sm">
            <div className="text-xs tracking-[0.28em] text-black/50">SUMMARY</div>
            <div className="mt-4 flex items-center justify-between text-sm text-black/65">
              <span>Subtotal</span>
              <span className="text-primary">{cents(subtotal)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-black/65">
              <span>Shipping</span>
              <span className="text-primary">{subtotal > 15000 ? "Free" : cents(900)}</span>
            </div>
            <div className="mt-4 h-px bg-black/10" />
            <div className="mt-4 flex items-center justify-between text-base font-semibold text-primary">
              <span>Total</span>
              <span>{cents(subtotal + (subtotal > 15000 ? 0 : 900))}</span>
            </div>
            <Link
              href="/checkout"
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-primary transition hover:scale-[1.02] active:scale-[0.99]"
            >
              Checkout
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

