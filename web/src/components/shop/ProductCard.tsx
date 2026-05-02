"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/types";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { notify } from "@/lib/notify";
import { sameSiteImageSrc } from "@/lib/publicAssets";

function cents(c: number) {
  return (c / 100).toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const add = useCartStore((s) => s.add);
  const wished = useWishlistStore((s) => s.has(product._id));
  const toggleWish = useWishlistStore((s) => s.toggle);

  const v0 = product.variants[0];
  const discountPct =
    v0?.compareAtCents && v0.compareAtCents > v0.priceCents
      ? Math.round(((v0.compareAtCents - v0.priceCents) / v0.compareAtCents) * 100)
      : 0;
  const lowStock = (v0?.stock ?? 0) <= 5;
  const topRated = (product.ratingAvg ?? 0) >= 4.6;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
      <div className="relative aspect-[4/5] overflow-hidden">
        <Link href={`/product/${product.slug}`} className="absolute inset-0">
          <span className="sr-only">{product.title}</span>
        </Link>

        <Image
          src={sameSiteImageSrc(product.images.primary)}
          alt={product.title}
          fill
          quality={100}
          unoptimized
          className="object-contain bg-white transition duration-300 ease-out group-hover:scale-[1.03]"
        />
        <Image
          src={sameSiteImageSrc(product.images.secondary)}
          alt={`${product.title} secondary`}
          fill
          quality={100}
          unoptimized
          className="object-contain bg-white opacity-0 transition duration-300 ease-out group-hover:opacity-100 group-hover:scale-[1.03]"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {product.badges?.includes("best_seller") ? <span className="rounded-full bg-black px-2 py-1 text-[10px] font-semibold text-white">BEST SELLER</span> : null}
          {product.badges?.includes("trending") ? <span className="rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">TRENDING</span> : null}
          {product.badges?.includes("new_arrival") ? <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">NEW ARRIVAL</span> : null}
          {discountPct > 0 ? <span className="rounded-full bg-accent px-2 py-1 text-[10px] font-semibold text-primary">-{discountPct}%</span> : null}
          {topRated ? <span className="rounded-full bg-primary px-2 py-1 text-[10px] font-semibold text-white">TOP RATED</span> : null}
          {lowStock ? <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-semibold text-rose-700">LIMITED STOCK</span> : null}
        </div>

        <button
          onClick={() => {
            toggleWish(product._id);
            notify(wished ? "Removed from wishlist" : "Added to wishlist");
          }}
          className={cn(
            "absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/90 transition",
            "hover:border-accent/70 active:scale-[0.98]"
          )}
          aria-label="Toggle wishlist"
        >
          <span className={cn("text-sm", wished ? "text-accent" : "text-black/70")}>
            ♥
          </span>
        </button>

        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition duration-200">
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
                notify("Added to cart");
              }
            }
            className="inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Add to cart
          </button>
        </div>
      </div>

      <div className="space-y-1 px-4 pb-4 pt-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight text-primary">{product.title}</div>
            <div className="text-xs tracking-[0.22em] text-black/60 uppercase">{product.category}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-primary">{cents(v0?.priceCents ?? 0)}</div>
            {v0?.compareAtCents ? (
              <div className="text-xs text-black/40 line-through">{cents(v0.compareAtCents)}</div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-black/60">
          <span>
            ★ {product.ratingAvg?.toFixed?.(1) ?? "0.0"} ({product.ratingCount ?? 0})
          </span>
          <button
            onClick={() => {
              const path = `/product/${product.slug}`;
              router.push(path);
              window.setTimeout(() => {
                if (window.location.pathname !== path) window.location.href = path;
              }, 150);
            }}
            className="text-accent hover:underline underline-offset-4"
          >
            View
          </button>
        </div>
        {(product.colors?.length ?? 0) > 0 ? <div className="pt-1 text-[11px] text-black/60">Colors: {product.colors.slice(0, 3).join(", ")}</div> : null}
      </div>
    </div>
  );
}

