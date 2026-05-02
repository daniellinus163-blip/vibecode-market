import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/supabaseServer";

function columnMissing(msg: string, column: string) {
  const m = msg.toLowerCase();
  const c = column.toLowerCase();
  return m.includes(c) && (m.includes("does not exist") || m.includes("schema cache"));
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    price?: number;
    image_url?: string;
    category?: string;
    description?: string;
  };
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = String(body.name).trim();
  if (body.price !== undefined) patch.price = Number(body.price);
  if (body.image_url !== undefined) patch.image_url = String(body.image_url).trim();
  if (body.category !== undefined) patch.category = String(body.category).trim();
  if (body.description !== undefined) patch.description = String(body.description).trim();

  let updated = await admin.service.from("products").update(patch).eq("id", id).select("*").single();
  if (updated.error && columnMissing(updated.error.message ?? "", "category")) {
    const { category, ...rest } = patch;
    void category;
    updated = await admin.service.from("products").update(rest).eq("id", id).select("*").single();
    if (!updated.error && updated.data) {
      return NextResponse.json({ product: { ...updated.data, category: "general" } });
    }
  }
  if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 500 });
  return NextResponse.json({ product: updated.data });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  const { id } = await ctx.params;
  const { error } = await admin.service.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
