import { NextResponse } from "next/server";
import { z } from "zod";
import { signAppAccessToken } from "@/lib/appJwt";
import { jwtSecret } from "@/lib/jwtSecret";
import { setAuthCookiesOnResponse } from "@/lib/setAuthCookies";
import { createAnonSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

/** Same behavior as Express POST /api/auth/login */
export async function POST(req: Request) {
  if (!jwtSecret()) {
    return NextResponse.json(
      { error: "jwt_secret_missing", message: "Add JWT_SECRET to environment variables." },
      { status: 503 },
    );
  }

  const supabase = createAnonSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: "Check email/password format." }, { status: 400 });
  }

  const { email, password, rememberMe } = parsed.data;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    const msg = error?.message ?? "";
    if (/email not confirmed/i.test(msg)) {
      return NextResponse.json(
        { error: "email_not_confirmed", message: "Please confirm your email first." },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: "invalid_credentials", message: "Invalid email or password." },
      { status: 401 },
    );
  }

  try {
    const appToken = signAppAccessToken({
      sub: data.user.id,
      role: "user",
      email: data.user.email ?? email,
      name: (data.user.user_metadata?.full_name as string) ?? "",
    });
    const res = NextResponse.json({ ok: true });
    setAuthCookiesOnResponse(res, {
      appToken,
      sbAccessToken: data.session?.access_token,
      rememberMe: Boolean(rememberMe),
    });
    return res;
  } catch {
    return NextResponse.json({ error: "jwt_secret_missing" }, { status: 503 });
  }
}
