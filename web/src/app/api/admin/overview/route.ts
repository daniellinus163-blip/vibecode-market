import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/supabaseServer";
import { isMissingTableError } from "@/lib/supabaseTableErrors";

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const service = admin.service;
  const warnings: string[] = [];

  async function countSafe(table: string): Promise<number> {
    const { count, error } = await service.from(table).select("id", { count: "exact", head: true });
    if (error) {
      if (isMissingTableError(error.message)) {
        warnings.push(
          `Table "${table}" is missing. Run web/supabase-admin-schema.sql (or web/supabase-fashion-videos-only.sql for videos only) in Supabase SQL Editor.`
        );
        return 0;
      }
      warnings.push(`${table}: ${error.message}`);
      return 0;
    }
    return count ?? 0;
  }

  const [users, products, videos] = await Promise.all([
    countSafe("profiles"),
    countSafe("products"),
    countSafe("fashion_videos"),
  ]);

  const recentRes = await service.from("profiles").select("id,email,created_at").order("created_at", { ascending: false }).limit(10);

  let recentSignups = recentRes.data ?? [];
  if (recentRes.error) {
    if (isMissingTableError(recentRes.error.message)) {
      warnings.push(
        `Table "profiles" is missing. Run web/supabase-admin-schema.sql in Supabase SQL Editor.`
      );
      recentSignups = [];
    } else {
      return NextResponse.json({ error: recentRes.error.message }, { status: 500 });
    }
  }

  const dedupedWarnings = [...new Set(warnings)];

  return NextResponse.json({
    counts: { users, products, videos },
    recentSignups,
    ...(dedupedWarnings.length ? { warnings: dedupedWarnings } : {}),
  });
}
