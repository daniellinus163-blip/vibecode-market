import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/supabaseServer";

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const service = admin.service;
  const [usersRes, productsRes, videosRes, recentRes] = await Promise.all([
    service.from("profiles").select("id", { count: "exact", head: true }),
    service.from("products").select("id", { count: "exact", head: true }),
    service.from("fashion_videos").select("id", { count: "exact", head: true }),
    service.from("profiles").select("id,email,created_at").order("created_at", { ascending: false }).limit(10),
  ]);

  return NextResponse.json({
    counts: {
      users: usersRes.count ?? 0,
      products: productsRes.count ?? 0,
      videos: videosRes.count ?? 0,
    },
    recentSignups: recentRes.data ?? [],
  });
}
