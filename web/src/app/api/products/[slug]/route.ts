import { NextResponse } from "next/server";
import { getMergedCatalogProducts } from "@/lib/catalogDbMerge";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await ctx.params;
  const slug = decodeURIComponent(rawSlug);
  const catalog = await getMergedCatalogProducts();
  const product =
    catalog.find((item) => item.slug === slug) ?? catalog.find((item) => item._id === slug);
  if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ product });
}
