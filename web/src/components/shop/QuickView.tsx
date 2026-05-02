"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/types";
import { useCartStore } from "@/store/cartStore";
import { sameSiteImageSrc } from "@/lib/publicAssets";

function cents(c: number) {
  return (c / 100).toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function QuickView({ product }: { product: Product }) {
  const add = useCartStore((s) => s.add);
  const router = useRouter();
  const v0 = product.variants[0];
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="inline-flex flex-1 items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-accent/60 hover:bg-white/10">
          Quick view
        </button>
      </Dialog.Trigger>
      <AnimatePresence>
        {open ? (
        <Dialog.Portal>
          <Dialog.Overlay asChild>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/70 backdrop-blur"
            />
          </Dialog.Overlay>

          <Dialog.Content asChild>
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
              className="fixed left-1/2 top-1/2 z-[70] max-h-[90vh] w-[min(920px,92vw)] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-[26px] border border-white/10 bg-primary shadow-luxe md:overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="relative aspect-[4/5] md:aspect-auto md:min-h-[520px]">
                  <Image src={sameSiteImageSrc(product.images.primary)} alt={product.title} fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent" />
                </div>
                <div className="p-6 md:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Dialog.Title className="text-xl font-semibold tracking-tight">{product.title}</Dialog.Title>
                      <div className="mt-1 text-xs uppercase tracking-[0.22em] text-white/60">
                        {product.category}
                      </div>
                    </div>
                    <Dialog.Close className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80 hover:border-accent/60 hover:text-white">
                      Close
                    </Dialog.Close>
                  </div>

                  <div className="mt-5 text-sm text-white/70 leading-relaxed">{product.description}</div>

                  <div className="mt-6 flex items-baseline justify-between">
                    <div className="text-2xl font-semibold text-white">{cents(v0?.priceCents ?? 0)}</div>
                    <div className="text-xs text-white/60">
                      ★ {product.ratingAvg?.toFixed?.(1) ?? "0.0"} ({product.ratingCount ?? 0})
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3">
                    <button
                      onClick={() =>
                        {
                          add(
                            {
                              productId: product._id,
                              title: product.title,
                              image: sameSiteImageSrc(product.images.primary),
                              variantLabel: v0?.label ?? "default",
                              unitPriceCents: v0?.priceCents ?? 0,
                            },
                            1
                          );
                          setOpen(false);
                        }
                      }
                      className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-primary transition hover:scale-[1.02] active:scale-[0.99]"
                    >
                      Add to cart
                    </button>
                    <button
                      onClick={() => {
                        const path = `/product/${product.slug}`;
                        setOpen(false);
                        router.push(path);
                        window.setTimeout(() => {
                          if (window.location.pathname !== path) {
                            window.location.href = path;
                          }
                        }, 180);
                      }}
                      className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-center text-sm font-semibold text-white transition hover:border-accent/60 hover:bg-white/10"
                    >
                      View full details
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </Dialog.Content>
        </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}

