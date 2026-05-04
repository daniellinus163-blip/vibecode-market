import type { Category, Product } from "@/lib/types";
import { getCatalogProducts } from "@/lib/catalogMockProducts";
import { createServiceSupabase } from "@/lib/supabaseServer";

const CATEGORIES: Category[] = ["kids", "teens", "youth", "adults", "accessories"];

export function normalizeProductCategory(c: string): Category {
  const s = String(c ?? "").toLowerCase().trim();
  return CATEGORIES.includes(s as Category) ? (s as Category) : "accessories";
}

export type DbProductRow = {
  id: string;
  name: string;
  price: number | string;
  image_url: string;
  category: string;
  description?: string | null;
  created_at?: string | null;
};

function slugify(name: string, id: string) {
  const base = String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "item"}-${String(id).replace(/-/g, "").slice(0, 8)}`;
}

/** Map Supabase admin `products` row → storefront Product model. */
export function dbProductRowToProduct(row: DbProductRow): Product {
  const priceCents = Math.round(Number(row.price) * 100);
  const slug = slugify(row.name, row.id);
  const img = String(row.image_url ?? "").trim() || "/api/local-image?id=1";
  return {
    _id: row.id,
    slug,
    title: String(row.name ?? "").trim() || "Product",
    description: String(row.description ?? "").trim() || "",
    category: normalizeProductCategory(row.category),
    badges: ["new_arrival"],
    colors: ["Default"],
    images: { primary: img, secondary: img, gallery: [img] },
    variants: [{ sku: `db-${String(row.id).slice(0, 8)}`, label: "One size", priceCents, stock: 99 }],
    ratingAvg: 4.5,
    ratingCount: 0,
    createdAt: row.created_at ?? undefined,
  };
}

/** Mock catalog plus DB products (service role read). DB rows appear first. */
export async function getMergedCatalogProducts(): Promise<Product[]> {
  const mock = getCatalogProducts();
  const service = createServiceSupabase();
  if (!service) return mock;

  const { data, error } = await service
    .from("products")
    .select("id,name,price,image_url,category,description,created_at")
    .order("created_at", { ascending: false });

  if (error || !data?.length) return mock;

  try {
    const dbProducts = (data as DbProductRow[]).map(dbProductRowToProduct);
    return [...dbProducts, ...mock];
  } catch {
    return mock;
  }
}
