import { NextRequest, NextResponse } from "next/server";
import { getMergedCatalogProducts } from "@/lib/catalogDbMerge";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = String(req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ suggestions: [] });
  const catalog = await getMergedCatalogProducts();
  const items = catalog.filter((item) => item.title.toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  return NextResponse.json({ suggestions: items.map((x) => ({ title: x.title, slug: x.slug })) });
}
