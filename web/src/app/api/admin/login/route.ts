import { NextResponse } from "next/server";
import { z } from "zod";
import { signAdminDashboardToken } from "@/lib/adminDashboardJwt";
import { jwtSecret } from "@/lib/jwtSecret";
import { compareSecretDigest } from "@/lib/secureCompare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string(),
});

const DEFAULT_ADMIN_EMAIL = "daniellinus163@gmail.com";

/**
 * Standalone admin dashboard login (no Supabase account required).
 * Set ADMIN_ACCESS_EMAIL and ADMIN_ACCESS_PASSWORD in server env (never commit the password).
 */
export async function POST(req: Request) {
  if (!jwtSecret()) {
    return NextResponse.json({ error: "jwt_secret_missing" }, { status: 503 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const expectedEmail = (process.env.ADMIN_ACCESS_EMAIL ?? DEFAULT_ADMIN_EMAIL).toLowerCase().trim();
  const expectedPassword = process.env.ADMIN_ACCESS_PASSWORD ?? "";
  if (!expectedPassword) {
    return NextResponse.json(
      {
        error: "admin_login_not_configured",
        hint: "Set ADMIN_ACCESS_PASSWORD in web/.env.local (server-only), then restart the dev server.",
      },
      { status: 503 },
    );
  }

  const email = parsed.data.email.toLowerCase().trim();
  if (email !== expectedEmail) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }
  if (!compareSecretDigest(parsed.data.password, expectedPassword)) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  let token: string;
  try {
    token = signAdminDashboardToken(email);
  } catch {
    return NextResponse.json({ error: "token_sign_failed" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  const isProd = process.env.NODE_ENV === "production";
  res.cookies.set("admin_dashboard_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
  return res;
}
