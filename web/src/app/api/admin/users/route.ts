import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/supabaseServer";
import { isMissingTableError } from "@/lib/supabaseTableErrors";

function columnMissing(msg: string, column: string) {
  const m = msg.toLowerCase();
  const c = column.toLowerCase();
  return m.includes(c) && (m.includes("does not exist") || m.includes("schema cache"));
}

type Row = { id: string; email?: string | null; created_at?: string | null; is_admin?: boolean | null };

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  let rows: Row[] = [];
  let profileError: { message: string } | null = null;

  const full = await admin.service.from("profiles").select("id,email,created_at,is_admin").order("created_at", { ascending: false });
  if (!full.error) {
    rows = (full.data ?? []) as Row[];
  } else if (isMissingTableError(full.error.message ?? "")) {
    rows = [];
  } else if (columnMissing(full.error.message ?? "", "is_admin")) {
    const slim = await admin.service.from("profiles").select("id,email,created_at").order("created_at", { ascending: false });
    profileError = slim.error;
    rows = ((slim.data ?? []) as Row[]).map((u) => ({ ...u, is_admin: false }));
  } else {
    profileError = full.error;
  }

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  const byId = new Map(rows.map((r) => [r.id, r]));

  try {
    let page = 1;
    for (;;) {
      const { data, error } = await admin.service.auth.admin.listUsers({ page, perPage: 200 });
      if (error) break;
      for (const u of data.users) {
        const id = u.id;
        const existing = byId.get(id);
        const email = u.email ?? existing?.email ?? "";
        const created_at = u.created_at ?? existing?.created_at ?? undefined;
        if (!existing) {
          byId.set(id, {
            id,
            email,
            created_at,
            is_admin: false,
          });
        } else if (!existing.email && email) {
          byId.set(id, { ...existing, email, created_at: created_at ?? existing.created_at });
        }
      }
      if (!data.users.length || data.users.length < 200) break;
      page += 1;
    }
  } catch {
    /* auth.admin optional */
  }

  const merged = Array.from(byId.values()).sort((a, b) =>
    String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
  );

  return NextResponse.json({ users: merged });
}
