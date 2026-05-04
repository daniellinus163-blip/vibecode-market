import { NextResponse } from "next/server";
import { requireOwnerUser } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight gate for UI: only owner Gmail gets HTTP 200. */
export async function GET() {
  const owner = await requireOwnerUser();
  if (!owner.ok) return NextResponse.json({ ok: false, error: owner.error }, { status: owner.status });
  return NextResponse.json({ ok: true });
}
