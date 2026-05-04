import { NextResponse } from "next/server";
import { z } from "zod";
import { signAppAccessToken } from "@/lib/appJwt";
import { jwtSecret } from "@/lib/jwtSecret";
import { setAuthCookiesOnResponse } from "@/lib/setAuthCookies";
import { createAnonSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PasswordSchema = z
  .string()
  .min(8)
  .regex(/[A-Z]/, "must_include_uppercase")
  .regex(/[a-z]/, "must_include_lowercase")
  .regex(/[0-9]/, "must_include_number")
  .regex(/[^A-Za-z0-9]/, "must_include_symbol");

const RegisterSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: PasswordSchema,
  name: z.string().trim().min(2).max(80),
});

/** Same behavior as Express POST /api/auth/register */
export async function POST(req: Request) {
  if (!jwtSecret()) {
    return NextResponse.json(
      {
        error: "jwt_secret_missing",
        message: "Add JWT_SECRET to environment variables.",
      },
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

  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_input",
        message: "Use a valid email, full name (2+ characters), and password (8+ chars with upper, lower, number, symbol).",
      },
      { status: 400 },
    );
  }

  const { email, password, name } = parsed.data;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });

  if (error) {
    if (/already/i.test(error.message)) {
      const signIn = await supabase.auth.signInWithPassword({ email, password });
      if (!signIn.error && signIn.data.user) {
        const res = NextResponse.json({ ok: true, existingUser: true });
        const token = signAppAccessToken({
          sub: signIn.data.user.id,
          role: "user",
          email: signIn.data.user.email ?? email,
          name: (signIn.data.user.user_metadata?.full_name as string) ?? name,
        });
        setAuthCookiesOnResponse(res, {
          appToken: token,
          sbAccessToken: signIn.data.session?.access_token,
          rememberMe: true,
        });
        return res;
      }
      return NextResponse.json(
        { error: "email_in_use", message: "This email is already registered. Sign in instead." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "signup_failed", message: error.message }, { status: 400 });
  }

  const userId = data.user?.id;
  if (!userId) {
    return NextResponse.json(
      {
        error: "signup_failed",
        message:
          "Signup did not return a user. If Supabase requires email confirmation, check your inbox or disable confirmations for testing.",
      },
      { status: 400 },
    );
  }

  try {
    const appToken = signAppAccessToken({ sub: userId, role: "user", email, name });
    const res = NextResponse.json({ ok: true });
    setAuthCookiesOnResponse(res, {
      appToken,
      sbAccessToken: data.session?.access_token,
      rememberMe: true,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "jwt_secret_missing", message: "JWT_SECRET not set." }, { status: 503 });
  }
}
