export type Category = "kids" | "teens" | "youth" | "adults" | "accessories";

export type ProductBadge = "trending" | "best_seller" | "flash_sale" | "new_arrival";

export type Product = {
  _id: string;
  title: string;
  slug: string;
  description: string;
  category: Category;
  badges: ProductBadge[];
  images: { primary: string; secondary: string; gallery: string[] };
  colors: string[];
  variants: { sku: string; label: string; priceCents: number; compareAtCents?: number; stock: number }[];
  ratingAvg: number;
  ratingCount: number;
  createdAt?: string;
};

