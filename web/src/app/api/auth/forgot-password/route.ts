import { NextResponse } from "next/server";
import { z } from "zod";
import { createAnonSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = z.object({ email: z.string().trim().toLowerCase().email() }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const supabase = createAnonSupabase();
  if (!supabase) return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });

  const origin =
    process.env.NEXT_PUBLIC_APP_ORIGIN?.trim().replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}` : "") ||
    "http://localhost:3000";

  const redirectTo = process.env.SUPABASE_RESET_REDIRECT_TO ?? `${origin}/login`;

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });
  if (error) return NextResponse.json({ error: "reset_request_failed", message: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
