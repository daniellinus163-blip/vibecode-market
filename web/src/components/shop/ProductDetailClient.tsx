"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { notify } from "@/lib/notify";
import { ProductCard } from "./ProductCard";
import { sameSiteImageSrc } from "@/lib/publicAssets";

function cents(c: number) {
  return (c / 100).toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function flyToCart(imgEl: HTMLImageElement | null) {
  const cart = document.querySelector('a[href="/cart"]');
  if (!imgEl || !(cart instanceof HTMLElement)) return;
  const from = imgEl.getBoundingClientRect();
  const to = cart.getBoundingClientRect();

  const clone = imgEl.cloneNode(true) as HTMLImageElement;
  clone.style.position = "fixed";
  clone.style.left = `${from.left}px`;
  clone.style.top = `${from.top}px`;
  clone.style.width = `${from.width}px`;
  clone.style.height = `${from.height}px`;
  clone.style.objectFit = "cover";
  clone.style.borderRadius = "18px";
  clone.style.zIndex = "9999";
  clone.style.pointerEvents = "none";
  clone.style.filter = "saturate(1.1) contrast(1.05)";
  document.body.appendChild(clone);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);

  clone.animate(
    [
      { transform: "translate3d(0,0,0) scale(1)", opacity: 1 },
      { transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.18)`, opacity: 0.9 },
    ],
    { duration: 650, easing: "cubic-bezier(0.2,0.8,0.2,1)" }
  ).onfinish = () => clone.remove();
}

export function ProductDetailClient({ product, related }: { product: Product; related: Product[] }) {
  const add = useCartStore((s) => s.add);
  const wished = useWishlistStore((s) => s.has(product._id));
  const toggleWish = useWishlistStore((s) => s.toggle);
  const variants = product.variants ?? [];
  const [variant, setVariant] = useState(variants[0]?.label ?? "default");
  const [color, setColor] = useState(product.colors?.[0] ?? "Default");
  const [galleryIdx, setGalleryIdx] = useState(0);
  const v = useMemo(() => variants.find((x) => x.label === variant) ?? variants[0], [variants, variant]);
  const gallery = [product.images.primary, product.images.secondary, ...(product.images.gallery ?? [])]
    .filter(Boolean)
    .map(sameSiteImageSrc);
  const currentImage = gallery[galleryIdx] ?? sameSiteImageSrc(product.images.primary);
  const discountPct =
    v?.compareAtCents && v.compareAtCents > v.priceCents
      ? Math.round(((v.compareAtCents - v.priceCents) / v.compareAtCents) * 100)
      : 0;
  const limitedStock = (v?.stock ?? 0) <= 5;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        <div className="relative overflow-hidden rounded-xl border border-black/10 bg-white md:col-span-7">
          <div className="relative aspect-[4/5] md:aspect-[5/4]">
            <Image
              src={currentImage}
              alt={product.title}
              fill
              priority
              quality={100}
              unoptimized
              className="object-contain bg-white"
            />
          </div>
          <div className="grid grid-cols-5 gap-2 p-3">
            {gallery.slice(0, 5).map((img, idx) => (
              <button key={img + idx} onClick={() => setGalleryIdx(idx)} className={idx === galleryIdx ? "overflow-hidden rounded-lg border-2 border-accent" : "overflow-hidden rounded-lg border border-black/10"}>
                <Image src={img} alt={`thumb ${idx + 1}`} width={120} height={90} quality={100} unoptimized className="h-16 w-full object-contain bg-white" />
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-5">
          <div className="text-xs uppercase tracking-[0.28em] text-black/60">{product.category}</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-primary md:text-4xl">{product.title}</h1>
          <div className="mt-2 flex items-center justify-between text-sm text-black/70">
            <span>
              ★ {product.ratingAvg?.toFixed?.(1) ?? "0.0"} ({product.ratingCount ?? 0})
            </span>
            <span className="text-primary">{cents(v?.priceCents ?? 0)}</span>
          </div>
          {discountPct > 0 ? <div className="mt-2 text-sm font-semibold text-accent">{discountPct}% discount available</div> : null}
          {limitedStock ? <div className="mt-1 text-sm font-semibold text-rose-600">Limited stock</div> : null}

          <p className="mt-5 text-sm leading-relaxed text-black/70">{product.description}</p>

          <div className="mt-6 rounded-xl border border-black/10 bg-white p-5">
            <div className="text-xs tracking-[0.28em] text-black/60">SIZE</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {variants.map((x) => {
                const active = x.label === variant;
                const disabled = x.stock <= 0;
                return (
                  <button
                    key={x.sku}
                    disabled={disabled}
                    onClick={() => setVariant(x.label)}
                    className={
                      active
                        ? "rounded-full bg-accent px-4 py-2 text-sm font-semibold text-primary"
                        : disabled
                          ? "rounded-full border border-black/10 bg-black/5 px-4 py-2 text-sm text-black/30"
                          : "rounded-full border border-black/15 bg-white px-4 py-2 text-sm text-black/75 hover:border-accent/50 transition"
                    }
                  >
                    {x.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 text-sm text-black/70">Stock: {v?.stock ?? 0}</div>
            {(product.colors?.length ?? 0) > 0 ? (
              <>
                <div className="mt-4 text-xs tracking-[0.28em] text-black/60">COLOR</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={
                        c === color
                          ? "rounded-full bg-accent px-4 py-2 text-sm font-semibold text-primary"
                          : "rounded-full border border-black/15 bg-white px-4 py-2 text-sm text-black/75 hover:border-accent/50 transition"
                      }
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            <div className="mt-5 flex flex-col gap-3">
              <button
                onClick={(e) => {
                  const container = (e.currentTarget.closest("main") ?? document) as ParentNode;
                  const img = container.querySelector("img") as HTMLImageElement | null;
                  flyToCart(img);
                  add(
                    {
                      productId: product._id,
                      title: product.title,
                      image: sameSiteImageSrc(product.images.primary),
                      variantLabel: `${v?.label ?? "default"} / ${color}`,
                      unitPriceCents: v?.priceCents ?? 0,
                    },
                    1
                  );
                  notify("Added to cart");
                }}
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-luxe transition hover:opacity-90"
              >
                Add to cart
              </button>
              <button
                onClick={() => {
                  toggleWish(product._id);
                  notify(wished ? "Removed from wishlist" : "Added to wishlist");
                }}
                className="rounded-full border border-black/15 bg-white px-6 py-3 text-center text-sm font-semibold text-black transition hover:border-accent/60"
              >
                {wished ? "Remove from Wishlist" : "Add to Wishlist"}
              </button>
              <Link
                href="/checkout"
                className="rounded-full border border-black/15 bg-white px-6 py-3 text-center text-sm font-semibold text-black transition hover:border-accent/60"
              >
                Checkout
              </Link>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-black/10 bg-white p-4">
            <div className="text-sm font-semibold text-primary">Ratings & Reviews</div>
            <div className="mt-1 text-sm text-black/70">
              Average {product.ratingAvg?.toFixed?.(1) ?? "0.0"} stars from {product.ratingCount ?? 0} reviews.
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-xs tracking-[0.3em] text-black/60">RELATED PRODUCTS</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary">Recommended</h2>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

