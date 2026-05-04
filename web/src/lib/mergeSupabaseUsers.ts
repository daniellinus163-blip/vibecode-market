import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingTableError } from "@/lib/supabaseTableErrors";

function columnMissing(msg: string, column: string) {
  const m = String(msg ?? "").toLowerCase();
  const c = column.toLowerCase();
  return m.includes(c) && (m.includes("does not exist") || m.includes("schema cache"));
}

export type MergedUserRow = {
  id: string;
  email: string;
  created_at?: string;
  is_admin?: boolean;
};

/** Profiles merged with Auth admin listUsers for accurate signup emails (OAuth, etc.). */
export async function mergeAuthAndProfileUsers(service: SupabaseClient): Promise<{ users: MergedUserRow[]; error?: string }> {
  type Row = { id: string; email?: string | null; created_at?: string | null; is_admin?: boolean | null };

  let rows: Row[] = [];
  let profileError: { message: string } | null = null;

  const full = await service.from("profiles").select("id,email,created_at,is_admin").order("created_at", { ascending: false });
  if (!full.error) {
    rows = (full.data ?? []) as Row[];
  } else if (isMissingTableError(full.error.message ?? "")) {
    rows = [];
  } else if (columnMissing(full.error.message ?? "", "is_admin")) {
    const slim = await service.from("profiles").select("id,email,created_at").order("created_at", { ascending: false });
    profileError = slim.error ?? null;
    rows = ((slim.data ?? []) as Row[]).map((u) => ({ ...u, is_admin: false }));
  } else {
    profileError = full.error;
  }

  if (profileError) return { users: [], error: profileError.message };

  const byId = new Map(rows.map((r) => [r.id, r]));

  try {
    let page = 1;
    for (;;) {
      const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
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
    /* auth.admin optional when service role missing */
  }

  const merged = Array.from(byId.values())
    .map((r) => ({
      id: r.id,
      email: String(r.email ?? ""),
      created_at: r.created_at ?? undefined,
      is_admin: Boolean(r.is_admin),
    }))
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));

  return { users: merged };
}
