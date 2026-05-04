import { NextResponse } from "next/server";
import { getCatalogProducts } from "@/lib/catalogMockProducts";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const product = getCatalogProducts().find((item) => item.slug === slug);
  if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ product });
}
