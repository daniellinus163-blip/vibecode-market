import { apiGet } from "@/lib/api";
import type { Product } from "@/lib/types";
import { ProductDetailClient } from "@/components/shop/ProductDetailClient";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const appJwt = cookieStore.get("access_token")?.value;
  const supabaseSession = cookieStore.get("sb_access_token")?.value;
  if (!appJwt && !supabaseSession) {
    redirect(`/login?next=${encodeURIComponent(`/product/${slug}`)}`);
  }
  let product: Product | null = null;
  try {
    const res = await apiGet<{ product: Product }>(`/api/products/${slug}`);
    product = res.product;
  } catch {
    product = null;
  }
  if (!product) {
    return (
      <main className="mx-auto max-w-3xl px-5 pb-24 pt-16">
        <div className="rounded-2xl border border-black/10 bg-white p-8 text-center">
          <h1 className="text-2xl font-semibold text-primary">Product not found</h1>
          <p className="mt-2 text-sm text-black/70">This item is unavailable right now. Browse other products instead.</p>
          <div className="mt-5">
            <Link href="/shop" className="inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-secondary">
              Go to shop
            </Link>
          </div>
        </div>
      </main>
    );
  }
  let related: Product[] = [];
  try {
    const res = await apiGet<{ items: Product[] }>(`/api/products?category=${product.category}`);
    related = (res.items ?? []).filter((p) => p._id !== product._id).slice(0, 6);
  } catch {
    related = [];
  }
  return <ProductDetailClient product={product} related={related} />;
}

