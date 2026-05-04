import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createUserScopedSupabase } from "@/lib/supabaseServer";
import { isMissingTableError } from "@/lib/supabaseTableErrors";
import { verifyAccessTokenSub } from "@/lib/verifyAccessCookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UpdateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(400).optional(),
  avatarUrl: z.string().trim().optional(),
});

export async function GET() {
  const cookieStore = await cookies();
  const access = cookieStore.get("access_token")?.value;
  const sbToken = cookieStore.get("sb_access_token")?.value;
  if (!access || !sbToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId = verifyAccessTokenSub(access);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = createUserScopedSupabase(sbToken);
  if (!sb) return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });

  const { data: authUser } = await sb.auth.getUser(sbToken);
  const profileRes = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
  const profileReadErr = profileRes.error;
  let profile = profileRes.data;

  if (profileReadErr && isMissingTableError(profileReadErr.message)) {
    return NextResponse.json({
      user: {
        _id: userId,
        email: authUser.user?.email ?? "",
        name: String(authUser.user?.user_metadata?.full_name ?? ""),
        role: "user",
        phone: String(authUser.user?.user_metadata?.phone ?? ""),
        address: String(authUser.user?.user_metadata?.address ?? ""),
        avatarUrl: String(authUser.user?.user_metadata?.avatar_url ?? ""),
        addresses: [],
      },
    });
  }

  if (!profile) {
    const { error: upErr } = await sb.from("profiles").upsert({
      id: userId,
      full_name: String(authUser.user?.user_metadata?.full_name ?? ""),
      email: authUser.user?.email ?? "",
    });
    if (!upErr) {
      ({ data: profile } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle());
    }
  }

  const row = profile as Record<string, unknown> | null;

  return NextResponse.json({
    user: {
      _id: userId,
      email: String(row?.email ?? authUser.user?.email ?? ""),
      name: String(row?.full_name ?? authUser.user?.user_metadata?.full_name ?? ""),
      role: "user",
      phone: String(authUser.user?.user_metadata?.phone ?? ""),
      address: String(authUser.user?.user_metadata?.address ?? ""),
      avatarUrl: String(row?.avatar_url ?? ""),
      addresses: [],
    },
  });
}

export async function PUT(req: Request) {
  const parsed = UpdateProfileSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const cookieStore = await cookies();
  const access = cookieStore.get("access_token")?.value;
  const sbToken = cookieStore.get("sb_access_token")?.value;
  if (!access || !sbToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId = verifyAccessTokenSub(access);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = createUserScopedSupabase(sbToken);
  if (!sb) return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });

  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.full_name = parsed.data.name;
  if (parsed.data.email !== undefined) patch.email = parsed.data.email;
  if (parsed.data.avatarUrl !== undefined) patch.avatar_url = parsed.data.avatarUrl;

  const { error } = await sb.from("profiles").upsert({ id: userId, ...patch });
  if (error) return NextResponse.json({ error: "update_failed", message: error.message }, { status: 400 });

  if (
    parsed.data.phone !== undefined ||
    parsed.data.address !== undefined ||
    parsed.data.name !== undefined ||
    parsed.data.avatarUrl !== undefined
  ) {
    await sb.auth.updateUser({
      data: {
        ...(parsed.data.name !== undefined ? { full_name: parsed.data.name } : {}),
        ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
        ...(parsed.data.address !== undefined ? { address: parsed.data.address } : {}),
        ...(parsed.data.avatarUrl !== undefined ? { avatar_url: parsed.data.avatarUrl } : {}),
      },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const parsed = z.object({ confirmText: z.literal("DELETE") }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const cookieStore = await cookies();
  const access = cookieStore.get("access_token")?.value;
  const sbToken = cookieStore.get("sb_access_token")?.value;
  if (!access || !sbToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId = verifyAccessTokenSub(access);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = createUserScopedSupabase(sbToken);
  if (!sb) return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });

  await sb.from("profiles").delete().eq("id", userId);

  const res = NextResponse.json({ ok: true });
  const clear = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", maxAge: 0, path: "/" };
  res.cookies.set("access_token", "", clear);
  res.cookies.set("sb_access_token", "", clear);
  return res;
}
