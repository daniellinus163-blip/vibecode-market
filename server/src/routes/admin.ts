import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { requireAdmin } from "../middleware/auth.js";
import { Product } from "../models/Product.js";
import { Order, type OrderStatus } from "../models/Order.js";
import { User } from "../models/User.js";

export const adminRouter = Router();
adminRouter.use(requireAdmin);

adminRouter.get("/users", async (_req, res) => {
  const users = await User.find().select({ email: 1, name: 1, role: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(100).lean();
  return res.json({ users });
});

adminRouter.patch("/users/:id", async (req, res) => {
  const id = req.params.id;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "invalid_input" });
  const parsed = z
    .object({
      name: z.string().min(2).optional(),
      role: z.enum(["user", "admin"]).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  await User.updateOne({ _id: id }, { $set: parsed.data });
  return res.json({ ok: true });
});

adminRouter.delete("/users/:id", async (req, res) => {
  const id = req.params.id;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "invalid_input" });
  await User.deleteOne({ _id: id });
  return res.json({ ok: true });
});

adminRouter.get("/products", async (_req, res) => {
  const items = await Product.find().sort({ createdAt: -1 }).limit(200).lean();
  return res.json({ items });
});

const UpsertProductSchema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().min(10),
  category: z.enum(["kids", "teens", "youth", "adults", "accessories"]),
  badges: z.array(z.enum(["trending", "best_seller", "flash_sale", "new_arrival"])).optional(),
  images: z.object({
    primary: z.string().url(),
    secondary: z.string().url(),
    gallery: z.array(z.string().url()).optional(),
  }),
  colors: z.array(z.string().min(2)).optional(),
  variants: z
    .array(
      z.object({
        sku: z.string().min(2),
        label: z.string().min(1),
        priceCents: z.number().int().min(0),
        compareAtCents: z.number().int().min(0).optional(),
        stock: z.number().int().min(0),
      })
    )
    .min(1),
});

adminRouter.post("/products", async (req, res) => {
  const parsed = UpsertProductSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  const created = await Product.create({
    ...parsed.data,
    badges: parsed.data.badges ?? [],
    colors: parsed.data.colors ?? [],
    images: { ...parsed.data.images, gallery: parsed.data.images.gallery ?? [] },
  });
  return res.json({ id: created._id.toString() });
});

adminRouter.patch("/products/:id", async (req, res) => {
  const id = req.params.id;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "invalid_input" });
  const parsed = UpsertProductSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  await Product.updateOne({ _id: id }, { $set: parsed.data });
  return res.json({ ok: true });
});

adminRouter.delete("/products/:id", async (req, res) => {
  const id = req.params.id;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "invalid_input" });
  await Product.deleteOne({ _id: id });
  return res.json({ ok: true });
});

adminRouter.get("/orders", async (_req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 }).limit(200).lean();
  return res.json({ orders });
});

const UpdateOrderStatusSchema = z.object({
  status: z.enum(["placed", "paid", "processing", "shipped", "out_for_delivery", "delivered", "cancelled"]),
  note: z.string().optional(),
});

adminRouter.post("/orders/:id/status", async (req, res) => {
  const id = req.params.id;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "invalid_input" });
  const parsed = UpdateOrderStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });

  const at = new Date();
  const order = await Order.findByIdAndUpdate(
    id,
    {
      $set: { status: parsed.data.status as OrderStatus },
      $push: { statusEvents: { status: parsed.data.status as OrderStatus, at, note: parsed.data.note } },
    },
    { new: true }
  ).lean();
  if (!order) return res.status(404).json({ error: "not_found" });

  const io = req.app.get("io");
  io?.to?.(`order:${order._id.toString()}`)?.emit?.("order:status", {
    orderId: order._id.toString(),
    status: order.status,
    statusEvents: order.statusEvents,
  });

  return res.json({ ok: true });
});

adminRouter.get("/analytics/summary", async (_req, res) => {
  const last30 = new Date();
  last30.setDate(last30.getDate() - 30);
  const [revenueAgg, orderCount, userCount] = await Promise.all([
    Order.aggregate([
      { $match: { createdAt: { $gte: last30 }, status: { $ne: "cancelled" } } },
      { $group: { _id: null, revenueCents: { $sum: "$totalCents" } } },
    ]),
    Order.countDocuments({ createdAt: { $gte: last30 } }),
    User.countDocuments({ createdAt: { $gte: last30 } }),
  ]);

  return res.json({
    revenueCents: revenueAgg[0]?.revenueCents ?? 0,
    orderCount,
    userCount,
  });
});

