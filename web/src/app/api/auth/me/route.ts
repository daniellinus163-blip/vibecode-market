import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { jwtSecret } from "@/lib/jwtSecret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JwtPayload = {
  sub: string;
  role: "user" | "admin";
  email?: string;
  name?: string;
};

/** Same JSON shape as Express GET /api/auth/me */
export async function GET() {
  const secret = jwtSecret();
  if (!secret) {
    return NextResponse.json({ error: "jwt_secret_missing" }, { status: 503 });
  }

  const cookieStore = await cookies();
  const appToken = cookieStore.get("access_token")?.value;
  if (!appToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: JwtPayload;
  try {
    payload = jwt.verify(appToken, secret) as JwtPayload;
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      _id: payload.sub,
      email: payload.email ?? "",
      name: payload.name ?? "",
      role: payload.role,
      addresses: [],
    },
  });
}
