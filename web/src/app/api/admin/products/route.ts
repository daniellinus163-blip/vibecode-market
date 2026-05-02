import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/supabaseServer";

function columnMissing(msg: string, column: string) {
  const m = msg.toLowerCase();
  const c = column.toLowerCase();
  return m.includes(c) && (m.includes("does not exist") || m.includes("schema cache"));
}

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const full = await admin.service
    .from("products")
    .select("id,name,price,image_url,category,description,created_at")
    .order("created_at", { ascending: false });
  if (!full.error) return NextResponse.json({ products: full.data ?? [] });
  if (!columnMissing(full.error.message ?? "", "category")) {
    return NextResponse.json({ error: full.error.message }, { status: 500 });
  }

  const slim = await admin.service
    .from("products")
    .select("id,name,price,image_url,description,created_at")
    .order("created_at", { ascending: false });
  if (slim.error) return NextResponse.json({ error: slim.error.message }, { status: 500 });
  const products = (slim.data ?? []).map((p: Record<string, unknown>) => ({ ...p, category: "general" }));
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    price?: number;
    image_url?: string;
    category?: string;
    description?: string;
  };

  const payload = {
    name: String(body.name ?? "").trim(),
    price: Number(body.price ?? 0),
    image_url: String(body.image_url ?? "").trim(),
    category: String(body.category ?? "general").trim(),
    description: String(body.description ?? "").trim(),
  };
  if (!payload.name || !payload.image_url || !Number.isFinite(payload.price)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  let inserted = await admin.service.from("products").insert(payload).select("*").single();
  if (inserted.error && columnMissing(inserted.error.message ?? "", "category")) {
    inserted = await admin.service
      .from("products")
      .insert({
        name: payload.name,
        price: payload.price,
        image_url: payload.image_url,
        description: payload.description,
      })
      .select("*")
      .single();
    if (!inserted.error && inserted.data) {
      return NextResponse.json({ product: { ...inserted.data, category: "general" } });
    }
  }
  if (inserted.error) return NextResponse.json({ error: inserted.error.message }, { status: 500 });
  return NextResponse.json({ product: inserted.data });
}
