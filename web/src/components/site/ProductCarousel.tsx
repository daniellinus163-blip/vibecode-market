"use client";

import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/shop/ProductCard";

export function ProductCarousel({ products, title }: { products: Product[]; title: string }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    dragFree: false,
  });
  const [selected, setSelected] = useState(0);
  const snapCount = useMemo(() => emblaApi?.scrollSnapList().length ?? 0, [emblaApi]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((idx: number) => emblaApi?.scrollTo(idx), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const id = window.setInterval(() => emblaApi.scrollNext(), 4200);
    return () => window.clearInterval(id);
  }, [emblaApi]);

  return (
    <section className="relative -mt-14 pb-20 md:-mt-28">
      <div className="mx-auto max-w-6xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          className="mb-6 flex items-end justify-between gap-4"
        >
          <div>
            <div className="text-xs tracking-[0.3em] text-white/60">CURATED</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={scrollPrev}
              className="rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-accent/60 hover:bg-white/10"
            >
              Prev
            </button>
            <button
              onClick={scrollNext}
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-primary transition hover:scale-[1.02] active:scale-[0.99]"
            >
              Next
            </button>
          </div>
        </motion.div>

        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.02] shadow-luxe">
          <div ref={emblaRef} className="overflow-hidden">
            <div className="flex">
              {products.map((p) => (
                <div key={p._id} className="min-w-0 flex-[0_0_78%] p-4 sm:flex-[0_0_46%] md:flex-[0_0_32%]">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>

          {snapCount > 1 ? (
            <div className="flex items-center justify-center gap-2 pb-5">
              {Array.from({ length: snapCount }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => scrollTo(idx)}
                  className={
                    idx === selected
                      ? "h-2 w-8 rounded-full bg-accent transition"
                      : "h-2 w-2 rounded-full bg-white/20 transition hover:bg-white/35"
                  }
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

