import { NextRequest, NextResponse } from "next/server";
import type { Category } from "@/lib/types";
import { getMergedCatalogProducts } from "@/lib/catalogDbMerge";
import { applyFiltersAndSort } from "@/lib/catalogMockProducts";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const category = (searchParams.get("category") as Category | null) ?? undefined;
  const q = searchParams.get("q") ?? undefined;
  const badge = searchParams.get("badge") ?? undefined;
  const minPrice = Number(searchParams.get("minPrice") ?? 0);
  const maxPrice = Number(searchParams.get("maxPrice") ?? 0);
  const minRating = Number(searchParams.get("minRating") ?? 0);
  const sort = searchParams.get("sort") ?? "newest";

  const merged = await getMergedCatalogProducts();
  const items = applyFiltersAndSort(merged, {
    category,
    q,
    badge,
    minPrice,
    maxPrice,
    minRating,
    sort,
  });
  return NextResponse.json({ items });
}
