import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

export const ordersRouter = Router();

ordersRouter.use(requireAuth);

function supabaseForUser(token?: string) {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  });
}

ordersRouter.get("/", async (req, res) => {
  const sbToken = req.cookies?.sb_access_token as string | undefined;
  if (!sbToken) return res.status(401).json({ error: "unauthorized" });
  const sb = supabaseForUser(sbToken);
  const { data, error } = await sb
    .from("orders")
    .select("id,user_id,total_price,status,created_at")
    .eq("user_id", req.user!.id)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return res.status(400).json({ error: "orders_load_failed", message: error.message });
  const orders = (data ?? []).map((o) => ({
    _id: o.id,
    status: o.status,
    totalCents: Math.round(Number(o.total_price ?? 0) * 100),
    createdAt: o.created_at,
  }));
  return res.json({ orders });
});

ordersRouter.get("/:orderId", async (req, res) => {
  const orderId = req.params.orderId;
  const sbToken = req.cookies?.sb_access_token as string | undefined;
  if (!sbToken) return res.status(401).json({ error: "unauthorized" });
  const sb = supabaseForUser(sbToken);
  const { data: order, error } = await sb.from("orders").select("*").eq("id", orderId).eq("user_id", req.user!.id).maybeSingle();
  if (error || !order) return res.status(404).json({ error: "not_found" });
  return res.json({ order });
});

const CheckoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string(),
        variantLabel: z.string(),
        quantity: z.number().int().min(1).max(10),
      })
    )
    .min(1),
  address: z.object({
    fullName: z.string().min(2),
    line1: z.string().min(2),
    line2: z.string().optional(),
    city: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().min(1),
    phone: z.string().min(5),
  }),
  couponCode: z.string().optional(),
});

function computeDiscount(subtotalCents: number, couponCode?: string) {
  const code = (couponCode ?? "").trim().toUpperCase();
  if (!code) return { discountCents: 0, couponCode: undefined as string | undefined };
  if (code === "GOLD10") return { discountCents: Math.round(subtotalCents * 0.1), couponCode: code };
  if (code === "FLASH15") return { discountCents: Math.round(subtotalCents * 0.15), couponCode: code };
  return { discountCents: 0, couponCode: code };
}

ordersRouter.post("/checkout", async (req, res) => {
  const parsed = CheckoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  const sbToken = req.cookies?.sb_access_token as string | undefined;
  if (!sbToken) return res.status(401).json({ error: "unauthorized" });
  const sb = supabaseForUser(sbToken);

  const subtotal = 0;
  const { discountCents } = computeDiscount(subtotal, parsed.data.couponCode);
  const shippingCents = 900;
  const totalPrice = Math.max(0, subtotal - discountCents + shippingCents) / 100;

  const { data: order, error } = await sb
    .from("orders")
    .insert({ user_id: req.user!.id, total_price: totalPrice, status: "pending" })
    .select("id")
    .single();
  if (error || !order) return res.status(400).json({ error: "order_create_failed", message: error?.message });
  return res.json({ orderId: order.id });
});

ordersRouter.get("/:orderId/track", async (req, res) => {
  const orderId = req.params.orderId;
  const sbToken = req.cookies?.sb_access_token as string | undefined;
  if (!sbToken) return res.status(401).json({ error: "unauthorized" });
  const sb = supabaseForUser(sbToken);
  const { data: order } = await sb.from("orders").select("status,created_at").eq("id", orderId).eq("user_id", req.user!.id).maybeSingle();
  if (!order) return res.status(404).json({ error: "not_found" });
  return res.json({ status: order.status, statusEvents: [{ status: order.status, at: order.created_at }] });
});

