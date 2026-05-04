import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getMergedCatalogProducts } from "@/lib/catalogDbMerge";
import { createServiceSupabase } from "@/lib/supabaseServer";
import { verifyAccessTokenSub } from "@/lib/verifyAccessCookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CartLine = { productId: string; variantLabel: string; quantity: number };

function discountFromCoupon(subtotalCents: number, code: string | undefined): number {
  const c = String(code ?? "").trim().toUpperCase();
  if (c === "GOLD10") return Math.round(subtotalCents * 0.1);
  if (c === "FLASH15") return Math.round(subtotalCents * 0.15);
  return 0;
}

export async function POST(req: Request) {
  const service = createServiceSupabase();
  if (!service) {
    return NextResponse.json({ error: "supabase_service_unavailable" }, { status: 503 });
  }

  let body: {
    items?: CartLine[];
    address?: Record<string, string>;
    couponCode?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) return NextResponse.json({ error: "empty_cart" }, { status: 400 });

  const address = body.address ?? {};
  const fullName = String(address.fullName ?? "").trim();
  const line1 = String(address.line1 ?? "").trim();
  const city = String(address.city ?? "").trim();
  if (!fullName || !line1 || !city) {
    return NextResponse.json({ error: "address_incomplete" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const access = cookieStore.get("access_token")?.value;
  const userId = access ? verifyAccessTokenSub(access) : null;

  const catalog = await getMergedCatalogProducts();
  let subtotalCents = 0;
  const lineSnapshots: Array<{
    productId: string;
    title: string;
    variantLabel: string;
    quantity: number;
    unitPriceCents: number;
  }> = [];

  for (const line of items) {
    const q = Math.max(1, Math.min(99, Number(line.quantity) || 1));
    const pid = String(line.productId ?? "").trim();
    const variantLabel = String(line.variantLabel ?? "One size").trim() || "One size";
    const p = catalog.find((x) => x._id === pid || x.slug === pid);
    if (!p) {
      return NextResponse.json({ error: "unknown_product", productId: pid }, { status: 400 });
    }
    const v = (p.variants ?? []).find((x) => x.label === variantLabel) ?? p.variants?.[0];
    if (!v) {
      return NextResponse.json({ error: "unknown_variant", productId: pid, variantLabel }, { status: 400 });
    }
    const unit = v.priceCents;
    subtotalCents += unit * q;
    lineSnapshots.push({
      productId: p._id,
      title: p.title,
      variantLabel: v.label,
      quantity: q,
      unitPriceCents: unit,
    });
  }

  const shippingCents = subtotalCents > 15000 ? 0 : 900;
  const discountCents = discountFromCoupon(subtotalCents, body.couponCode);
  const totalCents = Math.max(0, subtotalCents + shippingCents - discountCents);
  const total_price = totalCents / 100;

  const placedAt = new Date().toISOString();
  const status_events = [{ status: "placed", at: placedAt }];

  const { data, error } = await service
    .from("orders")
    .insert({
      user_id: userId,
      shipping_address: address,
      items: lineSnapshots,
      total_price,
      status: "placed",
      coupon_code: body.couponCode ? String(body.couponCode).trim() : null,
      status_events,
    })
    .select("id")
    .single();

  if (error) {
    if (String(error.message).toLowerCase().includes("could not find the table")) {
      return NextResponse.json(
        {
          error: "orders_table_missing",
          hint: "Run web/supabase-orders-schema.sql in the Supabase SQL editor, then retry checkout.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "order_insert_failed", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ orderId: String(data!.id) });
}
