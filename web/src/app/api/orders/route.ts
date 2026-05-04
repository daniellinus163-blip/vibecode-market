import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createUserScopedSupabase } from "@/lib/supabaseServer";
import { isMissingTableError } from "@/lib/supabaseTableErrors";
import { verifyAccessTokenSub } from "@/lib/verifyAccessCookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const access = cookieStore.get("access_token")?.value;
  const sbToken = cookieStore.get("sb_access_token")?.value;
  if (!access || !sbToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId = verifyAccessTokenSub(access);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = createUserScopedSupabase(sbToken);
  if (!sb) return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });

  const { data, error } = await sb
    .from("orders")
    .select("id,user_id,total_price,status,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    if (isMissingTableError(error.message)) return NextResponse.json({ orders: [] });
    return NextResponse.json({ error: "orders_load_failed", message: error.message }, { status: 400 });
  }

  const orders = (data ?? []).map((o: Record<string, unknown>) => ({
    _id: o.id,
    status: o.status,
    totalCents: Math.round(Number(o.total_price ?? 0) * 100),
    createdAt: o.created_at,
  }));

  return NextResponse.json({ orders });
}
