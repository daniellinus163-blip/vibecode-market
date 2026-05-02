import { Hero } from "@/components/site/Hero";
import { MarketplaceHome } from "@/components/site/MarketplaceHome";
import { apiGet } from "@/lib/api";
import type { Product } from "@/lib/types";

export default async function HomePage() {
  let products: Product[] = [];
  try {
    const res = await apiGet<{ items: Product[] }>("/api/products");
    products = res.items ?? [];
  } catch {
    products = [];
  }

  return (
    <main>
      <Hero />
      <MarketplaceHome products={products} />
    </main>
  );
}

