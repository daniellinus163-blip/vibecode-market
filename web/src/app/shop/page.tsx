import { apiGet } from "@/lib/api";
import type { Product } from "@/lib/types";
import { ShopPageClient } from "@/components/shop/ShopPageClient";

export default async function ShopPage() {
  let products: Product[] = [];
  try {
    const res = await apiGet<{ items: Product[] }>("/api/products");
    products = res.items ?? [];
  } catch {
    products = [];
  }

  return <ShopPageClient initialProducts={products} />;
}

