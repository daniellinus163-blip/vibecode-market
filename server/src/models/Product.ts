import mongoose, { Schema, Document } from "mongoose";
import type { Category } from "../types.js";

export type ProductBadge = "trending" | "best_seller" | "flash_sale" | "new_arrival";

export interface IProductVariant {
  sku: string;
  label: string;
  priceCents: number;
  compareAtCents?: number;
  stock: number;
}

export interface IProduct extends Document {
  title: string;
  slug: string;
  description: string;
  category: Category;
  badges: ProductBadge[];
  images: { primary: string; secondary: string; gallery: string[] };
  colors: string[];
  variants: IProductVariant[];
  ratingAvg: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const VariantSchema = new Schema<IProductVariant>(
  {
    sku: { type: String, required: true },
    label: { type: String, required: true },
    priceCents: { type: Number, required: true, min: 0 },
    compareAtCents: { type: Number, min: 0 },
    stock: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, enum: ["kids", "teens", "youth", "adults", "accessories"], required: true },
    badges: { type: [String], default: [] },
    images: {
      primary: { type: String, required: true },
      secondary: { type: String, required: true },
      gallery: { type: [String], default: [] },
    },
    colors: { type: [String], default: [] },
    variants: { type: [VariantSchema], default: [] },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Product = mongoose.model<IProduct>("Product", ProductSchema);

