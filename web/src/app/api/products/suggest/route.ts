import { NextRequest, NextResponse } from "next/server";
import { getCatalogProducts } from "@/lib/catalogMockProducts";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = String(req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ suggestions: [] });
  const items = getCatalogProducts()
    .filter((item) => item.title.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 8);
  return NextResponse.json({ suggestions: items.map((x) => ({ title: x.title, slug: x.slug })) });
}
