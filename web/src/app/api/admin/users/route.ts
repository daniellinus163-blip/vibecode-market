import { NextResponse } from "next/server";
import { mergeAuthAndProfileUsers } from "@/lib/mergeSupabaseUsers";
import { requireAdminUser } from "@/lib/supabaseServer";

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const merged = await mergeAuthAndProfileUsers(admin.service);
  if (merged.error) return NextResponse.json({ error: merged.error }, { status: 500 });
  return NextResponse.json({ users: merged.users });
}
