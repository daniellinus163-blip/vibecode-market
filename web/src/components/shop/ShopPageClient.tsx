"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import type { Category, Product } from "@/lib/types";
import { apiGet } from "@/lib/api";
import { getCatalogProducts } from "@/lib/catalogMockProducts";
import { ProductCard } from "./ProductCard";
import { cn } from "@/lib/cn";

const categories: { label: string; value?: Category }[] = [
  { label: "All" },
  { label: "Kids", value: "kids" },
  { label: "Teens", value: "teens" },
  { label: "Youth", value: "youth" },
  { label: "Adults", value: "adults" },
  { label: "Accessories", value: "accessories" },
];

function applyLocalFilters(
  items: Product[],
  opts: {
    category?: Category;
    q: string;
    badge?: "trending" | "best_seller" | "flash_sale";
    minPrice: number;
    maxPrice: number;
    minRating: number;
    sort: string;
  }
) {
  const list = items.filter((p) => {
    if (opts.category && p.category !== opts.category) return false;
    if (opts.q && !p.title.toLowerCase().includes(opts.q.toLowerCase())) return false;
    if (opts.badge && !p.badges.includes(opts.badge)) return false;
    const price = p.variants?.[0]?.priceCents ?? 0;
    if (opts.minPrice > 0 && price < opts.minPrice) return false;
    if (opts.maxPrice > 0 && price > opts.maxPrice) return false;
    if (opts.minRating > 0 && (p.ratingAvg ?? 0) < opts.minRating) return false;
    return true;
  });

  if (opts.sort === "price_asc") return [...list].sort((a, b) => (a.variants?.[0]?.priceCents ?? 0) - (b.variants?.[0]?.priceCents ?? 0));
  if (opts.sort === "popular") return [...list].sort((a, b) => (b.ratingCount ?? 0) - (a.ratingCount ?? 0));
  return [...list].sort((a, b) => (String(b.createdAt ?? b._id) > String(a.createdAt ?? a._id) ? 1 : -1));
}

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return v;
}

export function ShopPageClient({ initialProducts }: { initialProducts: Product[] }) {
  const localProducts = useMemo(() => getCatalogProducts(), []);
  const [category, setCategory] = useState<Category | undefined>(undefined);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 160);
  const [badge, setBadge] = useState<"trending" | "best_seller" | "flash_sale" | undefined>(undefined);
  const [products, setProducts] = useState<Product[]>((initialProducts?.length ?? 0) > 0 ? initialProducts : localProducts);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [minRating, setMinRating] = useState(0);
  const [size, setSize] = useState("all");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<{ title: string; slug: string }[]>([]);
  const [showSug, setShowSug] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    apiGet<{ items: Product[] }>(
      `/api/products?${new URLSearchParams({
        ...(category ? { category } : {}),
        ...(debouncedQuery ? { q: debouncedQuery } : {}),
        ...(badge ? { badge } : {}),
        ...(minPrice > 0 ? { minPrice: String(minPrice) } : {}),
        ...(maxPrice > 0 ? { maxPrice: String(maxPrice) } : {}),
        ...(minRating > 0 ? { minRating: String(minRating) } : {}),
        ...(sort ? { sort } : {}),
      }).toString()}`,
      { signal: ac.signal }
    )
      .then((r) => {
        const apiItems = r.items ?? [];
        if (apiItems.length > 0) {
          setProducts(apiItems);
          return;
        }
        setProducts(
          applyLocalFilters(localProducts, {
            category,
            q: debouncedQuery,
            badge,
            minPrice,
            maxPrice,
            minRating,
            sort,
          })
        );
      })
      .catch(() => {
        setProducts(
          applyLocalFilters(localProducts, {
            category,
            q: debouncedQuery,
            badge,
            minPrice,
            maxPrice,
            minRating,
            sort,
          })
        );
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, [category, debouncedQuery, badge, minPrice, maxPrice, minRating, sort, localProducts]);

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }
    apiGet<{ suggestions: { title: string; slug: string }[] }>(`/api/products/suggest?q=${encodeURIComponent(q)}`)
      .then((r) => setSuggestions(r.suggestions ?? []))
      .catch(() => {});
  }, [debouncedQuery]);

  const badgeButtons = useMemo(
    () =>
      [
        { label: "Trending", value: "trending" as const },
        { label: "Best Seller", value: "best_seller" as const },
        { label: "Flash Sale", value: "flash_sale" as const },
      ] as const,
    []
  );

  const filteredBySize =
    size === "all" ? products : products.filter((p) => (p.variants ?? []).some((v) => v.label.toLowerCase() === size.toLowerCase()));

  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 pt-10">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="text-xs tracking-[0.3em] text-black/60">SHOP</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-primary md:text-4xl">Marketplace</h1>
          </div>

          <div className="relative w-full max-w-xl">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setShowSug(true)}
              onBlur={() => window.setTimeout(() => setShowSug(false), 120)}
              placeholder="Search with live suggestions…"
              className="w-full rounded-full border border-black/15 bg-white px-5 py-3 text-sm text-black placeholder:text-black/40 outline-none transition focus:border-accent/70"
            />
            <AnimatePresence>
              {showSug && suggestions.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute left-0 right-0 top-[calc(100%+10px)] z-10 overflow-hidden rounded-[18px] border border-black/10 bg-white shadow-luxe"
                >
                  {suggestions.map((s) => (
                    <button
                      key={s.slug}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setQuery(s.title);
                        setShowSug(false);
                      }}
                      className="block w-full px-5 py-3 text-left text-sm text-black/80 transition hover:bg-black/5 hover:text-black"
                    >
                      <span className="mr-2 text-accent">■</span>
                      {s.title}
                    </button>
                  ))}
                  <div className="border-t border-black/10 px-5 py-2 text-right">
                    <Link href={suggestions[0] ? `/product/${suggestions[0].slug}` : "/shop"} className="text-xs text-accent hover:underline">
                      View first suggestion
                    </Link>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 rounded-[16px] border border-black/10 bg-white p-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const active = c.value === category || (!c.value && !category);
              return (
                <button
                  key={c.label}
                  onClick={() => setCategory(c.value)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition",
                    active
                      ? "border-accent/70 bg-accent text-primary font-semibold"
                      : "border-black/15 bg-white text-black/80 hover:border-accent/50"
                  )}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            {badgeButtons.map((b) => {
              const active = b.value === badge;
              return (
                <button
                  key={b.value}
                  onClick={() => setBadge(active ? undefined : b.value)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition",
                    active
                      ? "border-accent/70 bg-accent/10 text-accent"
                      : "border-black/15 bg-white text-black/70 hover:border-accent/50"
                  )}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            <input type="number" placeholder="Min price" onChange={(e) => setMinPrice(Number(e.target.value || 0))} className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
            <input type="number" placeholder="Max price" onChange={(e) => setMaxPrice(Number(e.target.value || 0))} className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
            <select onChange={(e) => setSize(e.target.value)} className="rounded-lg border border-black/15 px-3 py-2 text-sm"><option value="all">All sizes</option><option>S</option><option>M</option><option>L</option><option>XL</option></select>
            <select onChange={(e) => setMinRating(Number(e.target.value))} className="rounded-lg border border-black/15 px-3 py-2 text-sm"><option value="0">Any rating</option><option value="4">4+ stars</option><option value="4.5">4.5+ stars</option></select>
            <select onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-black/15 px-3 py-2 text-sm"><option value="newest">Newest</option><option value="price_asc">Price low to high</option><option value="popular">Popular</option></select>
          </div>
        </div>

        {/* Results */}
        <div className="relative">
          <AnimatePresence>
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 rounded-[26px] border border-black/10 bg-white/70 backdrop-blur"
              >
                <div className="grid grid-cols-2 gap-4 p-5 md:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="animate-pulse rounded-[22px] border border-black/10 bg-white">
                      <div className="aspect-[4/5] w-full rounded-[22px] bg-black/5" />
                      <div className="space-y-2 p-4">
                        <div className="h-3 w-2/3 rounded bg-black/10" />
                        <div className="h-3 w-1/2 rounded bg-black/10" />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <motion.div
            layout
            transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
            className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5"
          >
            {filteredBySize.map((p) => (
              <motion.div key={p._id} layout>
                <ProductCard product={p} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </main>
  );
}

