"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/shop/ProductCard";
import type { Category, Product } from "@/lib/types";
import { getPublicApiBase } from "@/lib/api";
import { getCatalogProducts } from "@/lib/catalogMockProducts";

function firstPrice(p: Product) {
  return p.variants?.[0]?.priceCents ?? 0;
}
function discounted(p: Product) {
  const v = p.variants?.[0];
  return !!v?.compareAtCents && v.compareAtCents > v.priceCents;
}

export function MarketplaceHome({ products }: { products: Product[] }) {
  const [allProducts, setAllProducts] = useState<Product[]>(() =>
    (products?.length ?? 0) > 0 ? products : getCatalogProducts()
  );
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [rating, setRating] = useState(0);
  const [size, setSize] = useState("all");
  const [sort, setSort] = useState("newest");
  const [showSug, setShowSug] = useState(false);

  useEffect(() => {
    if ((products?.length ?? 0) > 0) setAllProducts(products);
  }, [products]);

  useEffect(() => {
    if ((products?.length ?? 0) > 0) return;
    let mounted = true;
    const ac = new AbortController();
    const timeout = window.setTimeout(() => ac.abort(), 2500);
    setLoadingProducts(true);
    fetch(`${getPublicApiBase()}/api/products`, { credentials: "include", signal: ac.signal })
      .then((r) => r.json())
      .then((r) => {
        if (!mounted) return;
        const items = (r?.items ?? []) as Product[];
        if (items.length > 0) setAllProducts(items);
      })
      .catch(() => {})
      .finally(() => {
        window.clearTimeout(timeout);
        mounted && setLoadingProducts(false);
      });
    return () => {
      mounted = false;
      ac.abort();
      window.clearTimeout(timeout);
    };
  }, [products]);

  const filtered = useMemo(() => {
    const list = allProducts.filter((p) => {
      if (query && !p.title.toLowerCase().includes(query.toLowerCase())) return false;
      if (category !== "all" && p.category !== category) return false;
      const fp = firstPrice(p);
      if (minPrice > 0 && fp < minPrice) return false;
      if (maxPrice > 0 && fp > maxPrice) return false;
      if (rating > 0 && (p.ratingAvg ?? 0) < rating) return false;
      if (size !== "all" && !(p.variants ?? []).some((v) => v.label.toLowerCase() === size.toLowerCase())) return false;
      return true;
    });
    if (sort === "price_asc") return [...list].sort((a, b) => firstPrice(a) - firstPrice(b));
    if (sort === "popular") return [...list].sort((a, b) => (b.ratingCount ?? 0) - (a.ratingCount ?? 0));
    return [...list].sort((a, b) => (b._id > a._id ? 1 : -1));
  }, [allProducts, query, category, minPrice, maxPrice, rating, size, sort]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allProducts
      .filter((p) => p.title.toLowerCase().includes(q))
      .slice(0, 8)
      .map((p) => ({ slug: p.slug, title: p.title }));
  }, [query, allProducts]);

  const section = (title: string, items: Product[]) => (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        <span className="text-xs text-black/60">{items.length} items</span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {items.map((p) => (
          <ProductCard key={`${title}-${p._id}`} product={p} />
        ))}
      </div>
    </section>
  );

  const byCat = (c: Category) => allProducts.filter((p) => p.category === c);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <aside className="rounded-xl border border-black/10 bg-white p-4 lg:col-span-2 lg:sticky lg:top-20 lg:h-fit">
          <p className="text-xs font-semibold tracking-[0.2em] text-black/60">CATEGORIES</p>
          <div className="mt-3 space-y-2">
            {["kids", "teens", "youth", "adults", "accessories"].map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCategory(c as Category);
                  setQuery("");
                  setMinPrice(0);
                  setMaxPrice(0);
                  setRating(0);
                  setSize("all");
                  setSort("newest");
                }}
                className="block text-left text-sm text-black/80 hover:text-black"
              >
                {c[0].toUpperCase() + c.slice(1)}
              </button>
            ))}
            <button
              onClick={() => {
                setCategory("all");
                setQuery("");
                setMinPrice(0);
                setMaxPrice(0);
                setRating(0);
                setSize("all");
                setSort("newest");
              }}
              className="block text-left text-sm font-semibold text-accent"
            >
              All
            </button>
          </div>
        </aside>

        <div className="lg:col-span-10">
          <div className="rounded-xl border border-black/10 bg-white p-4">
            <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setShowSug(true)}
              onBlur={() => window.setTimeout(() => setShowSug(false), 120)}
              placeholder="Search products..."
              className="w-full rounded-lg border border-black/15 px-4 py-3 text-sm outline-none focus:border-accent"
            />
            {showSug && suggestions.length > 0 ? (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-10 overflow-hidden rounded-xl border border-black/10 bg-white shadow-luxe">
                {suggestions.map((s) => (
                  <button
                    key={s.slug}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setQuery(s.title);
                      setShowSug(false);
                    }}
                    className="block w-full px-4 py-3 text-left text-sm text-black/80 transition hover:bg-black/5 hover:text-black"
                  >
                    <span className="mr-2 text-accent">■</span>
                    {s.title}
                  </button>
                ))}
              </div>
            ) : null}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
              <input type="number" placeholder="Min price" onChange={(e) => setMinPrice(Number(e.target.value || 0))} className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
              <input type="number" placeholder="Max price" onChange={(e) => setMaxPrice(Number(e.target.value || 0))} className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
              <select onChange={(e) => setSize(e.target.value)} className="rounded-lg border border-black/15 px-3 py-2 text-sm">
                <option value="all">All sizes</option><option>S</option><option>M</option><option>L</option><option>XL</option>
              </select>
              <select onChange={(e) => setRating(Number(e.target.value))} className="rounded-lg border border-black/15 px-3 py-2 text-sm">
                <option value="0">Any rating</option><option value="4">4+ stars</option><option value="4.5">4.5+ stars</option>
              </select>
              <select onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-black/15 px-3 py-2 text-sm">
                <option value="newest">Newest</option><option value="price_asc">Price low to high</option><option value="popular">Popular</option>
              </select>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black/75">
            Showing <span className="font-semibold text-black">{filtered.length}</span> products
            <span className="ml-3 text-xs text-emerald-700">Secure checkout</span>
            {loadingProducts ? <span className="ml-3 text-xs text-black/50">Loading catalog...</span> : null}
          </div>

          <section className="mt-6">
            <h2 className="mb-3 text-lg font-semibold text-primary">Filtered Results</h2>
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-black/10 bg-white p-8 text-center text-black/60">No products found</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                {filtered.map((p) => (
                  <ProductCard key={`filtered-${p._id}`} product={p} />
                ))}
              </div>
            )}
          </section>

          {section("Featured Products", allProducts.slice(0, 20))}
          {section("New Arrivals", allProducts.filter((p) => p.badges?.includes("new_arrival")).slice(0, 20))}
          {section("Best Sellers", allProducts.filter((p) => p.badges?.includes("best_seller")).slice(0, 20))}
          {section("Discounted Items", allProducts.filter(discounted).slice(0, 20))}
          {section("Kids", byCat("kids").slice(0, 20))}
          {section("Teens", byCat("teens").slice(0, 20))}
          {section("Youth", byCat("youth").slice(0, 20))}
          {section("Adults", byCat("adults").slice(0, 20))}
          {section("Accessories", byCat("accessories").slice(0, 20))}
        </div>
      </div>
    </div>
  );
}

