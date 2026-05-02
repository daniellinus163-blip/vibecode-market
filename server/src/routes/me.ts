import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { Product } from "../models/Product.js";
import { Review } from "../models/Review.js";

export const meRouter = Router();

meRouter.use(requireAuth);

meRouter.get("/", async (req, res) => {
  const user = await User.findById(req.user!.id)
    .select({ email: 1, name: 1, role: 1, addresses: 1, wishlist: 1, recentlyViewed: 1 })
    .lean();
  if (!user) return res.status(404).json({ error: "not_found" });
  return res.json({ user });
});

const UpdateProfileSchema = z.object({
  name: z.string().min(2).optional(),
});

meRouter.patch("/", async (req, res) => {
  const parsed = UpdateProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  const user = await User.findByIdAndUpdate(req.user!.id, { $set: parsed.data }, { new: true })
    .select({ email: 1, name: 1, role: 1 })
    .lean();
  return res.json({ user });
});

const AddressSchema = z.object({
  label: z.string().min(1),
  fullName: z.string().min(2),
  line1: z.string().min(2),
  line2: z.string().optional(),
  city: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1),
  phone: z.string().min(5),
  isDefault: z.boolean().optional(),
});

meRouter.post("/addresses", async (req, res) => {
  const parsed = AddressSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });

  if (parsed.data.isDefault) {
    await User.updateOne({ _id: req.user!.id }, { $set: { "addresses.$[].isDefault": false } });
  }
  const user = await User.findByIdAndUpdate(
    req.user!.id,
    { $push: { addresses: parsed.data } },
    { new: true }
  )
    .select({ addresses: 1 })
    .lean();
  return res.json({ addresses: user?.addresses ?? [] });
});

meRouter.patch("/addresses/:addressId", async (req, res) => {
  const addressId = req.params.addressId;
  if (!mongoose.isValidObjectId(addressId)) return res.status(400).json({ error: "invalid_input" });
  const parsed = AddressSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });

  if (parsed.data.isDefault) {
    await User.updateOne({ _id: req.user!.id }, { $set: { "addresses.$[].isDefault": false } });
  }

  const setObj: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) setObj[`addresses.$.${k}`] = v;

  const user = await User.findOneAndUpdate(
    { _id: req.user!.id, "addresses._id": addressId },
    { $set: setObj },
    { new: true }
  )
    .select({ addresses: 1 })
    .lean();
  return res.json({ addresses: user?.addresses ?? [] });
});

meRouter.delete("/addresses/:addressId", async (req, res) => {
  const addressId = req.params.addressId;
  const user = await User.findByIdAndUpdate(
    req.user!.id,
    { $pull: { addresses: { _id: addressId } } },
    { new: true }
  )
    .select({ addresses: 1 })
    .lean();
  return res.json({ addresses: user?.addresses ?? [] });
});

meRouter.get("/wishlist", async (req, res) => {
  const user = await User.findById(req.user!.id).select({ wishlist: 1 }).lean();
  const ids = (user?.wishlist ?? []) as mongoose.Types.ObjectId[];
  const products = await Product.find({ _id: { $in: ids } }).lean();
  return res.json({ products });
});

meRouter.post("/wishlist/toggle", async (req, res) => {
  const parsed = z.object({ productId: z.string() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  if (!mongoose.isValidObjectId(parsed.data.productId)) return res.status(400).json({ error: "invalid_input" });

  const user = await User.findById(req.user!.id).select({ wishlist: 1 }).lean();
  const pid = new mongoose.Types.ObjectId(parsed.data.productId);
  const has = (user?.wishlist ?? []).some((x) => x.toString() === pid.toString());

  await User.updateOne(
    { _id: req.user!.id },
    has ? { $pull: { wishlist: pid } } : { $addToSet: { wishlist: pid } }
  );

  return res.json({ ok: true, wished: !has });
});

meRouter.get("/recently-viewed", async (req, res) => {
  const user = await User.findById(req.user!.id).select({ recentlyViewed: 1 }).lean();
  const ids = (user?.recentlyViewed ?? []) as mongoose.Types.ObjectId[];
  const products = await Product.find({ _id: { $in: ids } }).lean();
  return res.json({ products });
});

const CreateReviewSchema = z.object({
  productId: z.string(),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(2),
  body: z.string().min(10),
});

meRouter.post("/reviews", async (req, res) => {
  const parsed = CreateReviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  if (!mongoose.isValidObjectId(parsed.data.productId)) return res.status(400).json({ error: "invalid_input" });

  const review = await Review.findOneAndUpdate(
    { product: parsed.data.productId, user: req.user!.id },
    {
      $set: {
        rating: parsed.data.rating,
        title: parsed.data.title,
        body: parsed.data.body,
      },
    },
    { upsert: true, new: true }
  ).lean();

  // keep product rating updated (simple recalculation)
  const agg = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(parsed.data.productId) } },
    { $group: { _id: "$product", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const x = agg[0];
  await Product.updateOne(
    { _id: parsed.data.productId },
    { $set: { ratingAvg: x?.avg ?? 0, ratingCount: x?.count ?? 0 } }
  );

  return res.json({ review });
});

