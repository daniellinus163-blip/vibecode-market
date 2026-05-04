import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const clear = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", maxAge: 0, path: "/" };
  res.cookies.set("access_token", "", clear);
  res.cookies.set("sb_access_token", "", clear);
  return res;
}
