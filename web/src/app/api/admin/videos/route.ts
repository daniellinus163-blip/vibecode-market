import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/supabaseServer";

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  const { data, error } = await admin.service
    .from("fashion_videos")
    .select("id,title,embed_url,created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ videos: data ?? [] });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  const body = (await req.json().catch(() => ({}))) as { title?: string; embed_url?: string };
  const title = String(body.title ?? "").trim();
  const embed_url = String(body.embed_url ?? "").trim();
  if (!title || !embed_url) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const { data, error } = await admin.service.from("fashion_videos").insert({ title, embed_url }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ video: data });
}
