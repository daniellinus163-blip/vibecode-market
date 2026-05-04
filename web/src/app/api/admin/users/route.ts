import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/supabaseServer";
import { isMissingTableError } from "@/lib/supabaseTableErrors";

function columnMissing(msg: string, column: string) {
  const m = msg.toLowerCase();
  const c = column.toLowerCase();
  return m.includes(c) && (m.includes("does not exist") || m.includes("schema cache"));
}

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  let data: unknown;
  let error: { message: string } | null = null;

  const full = await admin.service.from("profiles").select("id,email,created_at,is_admin").order("created_at", { ascending: false });
  if (!full.error) {
    data = full.data;
  } else if (isMissingTableError(full.error.message ?? "")) {
    return NextResponse.json({ users: [] });
  } else if (columnMissing(full.error.message ?? "", "is_admin")) {
    const slim = await admin.service.from("profiles").select("id,email,created_at").order("created_at", { ascending: false });
    error = slim.error;
    data = (slim.data ?? []).map((u: Record<string, unknown>) => ({ ...u, is_admin: false }));
  } else {
    error = full.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data ?? [] });
}
