import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAnonSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";

/**
 * Same behavior as server Express POST /api/auth/oauth/sync.
 * Lets Vercel (Next only) complete Google sign-in without a separate API host
 * when NEXT_PUBLIC_API_URL is unset (same-origin API calls).
 */
const BodySchema = z.object({
  accessToken: z.string().min(10),
  rememberMe: z.boolean().optional(),
});

type JwtPayload = {
  sub: string;
  role: "user" | "admin";
  email?: string;
  name?: string;
};

function signAccessToken(payload: JwtPayload) {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) throw new Error("Missing JWT_SECRET");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export async function POST(req: Request) {
  const supabase = createAnonSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });
  }
  if (!process.env.JWT_SECRET?.trim()) {
    return NextResponse.json(
      {
        error: "jwt_secret_missing",
        message:
          "Add JWT_SECRET to Vercel environment variables (same secret as your API if you use one).",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { accessToken, rememberMe } = parsed.data;
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    return NextResponse.json({ error: "invalid_oauth_session" }, { status: 401 });
  }

  const user = data.user;
  let appToken: string;
  try {
    appToken = signAccessToken({
      sub: user.id,
      role: "user",
      email: user.email ?? "",
      name:
        (user.user_metadata?.full_name as string) ?? (user.user_metadata?.name as string) ?? "",
    });
  } catch {
    return NextResponse.json(
      { error: "jwt_secret_missing", message: "JWT_SECRET not set or invalid." },
      { status: 503 },
    );
  }

  const isProd = process.env.NODE_ENV === "production";
  const maxAgeSec = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;

  const res = NextResponse.json({ ok: true });
  res.cookies.set("access_token", appToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: maxAgeSec,
    path: "/",
  });
  res.cookies.set("sb_access_token", accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: maxAgeSec,
    path: "/",
  });
  return res;
}
