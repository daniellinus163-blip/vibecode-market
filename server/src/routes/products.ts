import { Router } from "express";
import type { Category } from "../types.js";

export const productsRouter = Router();

const CATEGORY_IMAGE_IDS: Record<Category, number[]> = {
  kids: [11, 12, 14, 16, 18, 19, 21, 23],
  teens: [13, 15, 17, 20, 22, 23, 8],
  youth: [2, 9, 17, 20, 22, 23, 24],
  adults: [24, 25, 26, 2, 9],
  accessories: [1, 8, 9, 13, 15],
};

function categoryImage(category: Category, index: number) {
  const arr = CATEGORY_IMAGE_IDS[category];
  const id = arr[index % arr.length];
  return `/api/local-image?id=${id}`;
}

function buildMockProducts(count: number, startIndex = 0) {
  const categoryPool: Category[] = ["kids", "teens", "youth", "adults", "accessories"];
  const namePool = ["Classic Tee", "Urban Hoodie", "Tailored Jacket", "Flex Jeans", "Sport Set", "Daily Cap", "Street Shirt", "Comfort Knit"];
  const colorPool = [["Black", "White"], ["Gold", "Black"], ["Navy", "White"], ["Olive", "Black"], ["Cream", "Gold"]];

  return Array.from({ length: count }).map((_, offset) => {
    const idx = startIndex + offset;
    const category = categoryPool[idx % categoryPool.length];
    const name = namePool[idx % namePool.length];
    const primary = categoryImage(category, idx * 2);
    const secondary = categoryImage(category, idx * 2 + 1);
    const price = 3900 + (idx % 18) * 900;
    const compareAt = idx % 2 === 0 ? price + 1500 : undefined;
    const badges = [
      ...(idx % 4 === 0 ? (["best_seller"] as const) : []),
      ...(idx % 5 === 0 ? (["trending"] as const) : []),
      ...(idx % 3 === 0 ? (["flash_sale"] as const) : []),
      ...(idx % 2 === 1 ? (["new_arrival"] as const) : []),
    ];
    return {
      title: `${name} ${idx + 1}`,
      slug: `${name.toLowerCase().replace(/\s+/g, "-")}-${idx + 1}`,
      description: `Stylish ${name.toLowerCase()} for ${category} with comfortable fit and durable fabric.`,
      category,
      badges,
      colors: colorPool[idx % colorPool.length],
      images: { primary, secondary, gallery: [primary, secondary] },
      variants: [
        { sku: `SKU-${idx + 1}-S`, label: "S", priceCents: price, compareAtCents: compareAt, stock: 6 + (idx % 12) },
        { sku: `SKU-${idx + 1}-M`, label: "M", priceCents: price, compareAtCents: compareAt, stock: 5 + (idx % 10) },
        { sku: `SKU-${idx + 1}-L`, label: "L", priceCents: price + 400, compareAtCents: compareAt ? compareAt + 400 : undefined, stock: 2 + (idx % 8) },
        { sku: `SKU-${idx + 1}-XL`, label: "XL", priceCents: price + 700, compareAtCents: compareAt ? compareAt + 700 : undefined, stock: 1 + (idx % 6) },
      ],
      ratingAvg: Number((3.7 + (idx % 13) * 0.1).toFixed(1)),
      ratingCount: 10 + idx * 2,
    };
  });
}

function applyFiltersAndSort(
  items: any[],
  opts: {
    category?: Category;
    q?: string;
    badge?: string;
    minPrice: number;
    maxPrice: number;
    minRating: number;
    sort: string;
  }
) {
  const filtered = items.filter((p) => {
    if (opts.category && p.category !== opts.category) return false;
    if (opts.q && !String(p.title).toLowerCase().includes(opts.q.toLowerCase())) return false;
    if (opts.badge && !(p.badges ?? []).includes(opts.badge)) return false;
    const price = p.variants?.[0]?.priceCents ?? 0;
    if (opts.minPrice > 0 && price < opts.minPrice) return false;
    if (opts.maxPrice > 0 && price > opts.maxPrice) return false;
    if (opts.minRating > 0 && (p.ratingAvg ?? 0) < opts.minRating) return false;
    return true;
  });

  if (opts.sort === "price_asc") {
    return filtered.sort((a, b) => (a.variants?.[0]?.priceCents ?? 0) - (b.variants?.[0]?.priceCents ?? 0));
  }
  if (opts.sort === "popular") {
    return filtered.sort((a, b) => (b.ratingCount ?? 0) - (a.ratingCount ?? 0));
  }
  return filtered.sort((a, b) => (String(b.createdAt ?? b.slug) > String(a.createdAt ?? a.slug) ? 1 : -1));
}

productsRouter.get("/", async (req, res) => {
  const category = (req.query.category as Category | undefined) ?? undefined;
  const q = (req.query.q as string | undefined) ?? undefined;
  const badge = (req.query.badge as string | undefined) ?? undefined;
  const minPrice = Number(req.query.minPrice ?? 0);
  const maxPrice = Number(req.query.maxPrice ?? 0);
  const minRating = Number(req.query.minRating ?? 0);
  const sort = String(req.query.sort ?? "newest");

  const mockItems = buildMockProducts(50, 0);
  const items = applyFiltersAndSort(mockItems, { category, q, badge, minPrice, maxPrice, minRating, sort });
  return res.json({ items });
});

productsRouter.get("/suggest", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) return res.json({ suggestions: [] });
  const items = buildMockProducts(50, 0).filter((item) => item.title.toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  return res.json({ suggestions: items.map((x) => ({ title: x.title, slug: x.slug })) });
});

productsRouter.get("/:slug", async (req, res) => {
  const slug = req.params.slug;
  const product = buildMockProducts(50, 0).find((item) => item.slug === slug);
  if (!product) return res.status(404).json({ error: "not_found" });

  return res.json({ product });
});

productsRouter.post("/:slug/review", async (_req, res) => {
  // implemented in /api/me/reviews to ensure authenticated & linked to user
  return res.status(404).json({ error: "not_found" });
});

productsRouter.get("/:slug/reviews", async (req, res) => {
  const slug = req.params.slug;
  const product = buildMockProducts(50, 0).find((item) => item.slug === slug);
  if (!product) return res.status(404).json({ error: "not_found" });
  return res.json({ reviews: [] });
});

productsRouter.get("/_seed/dev", async (_req, res) => {
  if (process.env.NODE_ENV === "production") return res.status(404).json({ error: "not_found" });

  return res.json({ ok: true, seeded: true, count: 50 });
});

