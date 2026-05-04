import { NextResponse } from "next/server";
import { mergeAuthAndProfileUsers } from "@/lib/mergeSupabaseUsers";
import { requireOwnerUser } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const owner = await requireOwnerUser();
  if (!owner.ok) return NextResponse.json({ error: owner.error }, { status: owner.status });

  const merged = await mergeAuthAndProfileUsers(owner.service);
  if (merged.error) return NextResponse.json({ error: merged.error }, { status: 500 });
  return NextResponse.json({ users: merged.users });
}
