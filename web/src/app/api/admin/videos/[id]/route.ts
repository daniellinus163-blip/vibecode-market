import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/supabaseServer";
import { isMissingTableError } from "@/lib/supabaseTableErrors";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { title?: string; embed_url?: string };
  const patch: Record<string, unknown> = {};
  if (body.title !== undefined) patch.title = String(body.title).trim();
  if (body.embed_url !== undefined) patch.embed_url = String(body.embed_url).trim();
  const { data, error } = await admin.service.from("fashion_videos").update(patch).eq("id", id).select("*").single();
  if (error) {
    if (isMissingTableError(error.message)) {
      return NextResponse.json(
        { error: "fashion_videos table missing", hint: "Run web/supabase-fashion-videos-only.sql in Supabase SQL Editor." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ video: data });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  const { id } = await ctx.params;
  const { error } = await admin.service.from("fashion_videos").delete().eq("id", id);
  if (error) {
    if (isMissingTableError(error.message)) {
      return NextResponse.json(
        { error: "fashion_videos table missing", hint: "Run web/supabase-fashion-videos-only.sql in Supabase SQL Editor." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
