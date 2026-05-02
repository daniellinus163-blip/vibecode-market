import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { createClient } from "@supabase/supabase-js";

export const userRouter = Router();
userRouter.use(requireAuth);

function supabaseForUser(token?: string) {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  });
}

const UpdateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(400).optional(),
  avatarUrl: z.string().trim().optional(),
});

userRouter.get("/profile", async (req, res) => {
  const sbToken = req.cookies?.sb_access_token as string | undefined;
  if (!sbToken) return res.status(401).json({ error: "unauthorized" });
  const sb = supabaseForUser(sbToken);
  const userId = req.user!.id;

  const { data: authUser } = await sb.auth.getUser(sbToken);
  const { data: profile } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();

  if (!profile) {
    await sb.from("profiles").upsert({
      id: userId,
      full_name: authUser.user?.user_metadata?.full_name ?? "",
      email: authUser.user?.email ?? "",
    });
  }

  const { data: currentProfile } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
  return res.json({
    user: {
      _id: userId,
      email: currentProfile?.email ?? authUser.user?.email ?? "",
      name: currentProfile?.full_name ?? authUser.user?.user_metadata?.full_name ?? "",
      role: "user",
      phone: (authUser.user?.user_metadata?.phone as string) ?? "",
      address: (authUser.user?.user_metadata?.address as string) ?? "",
      avatarUrl: currentProfile?.avatar_url ?? "",
      addresses: [],
    },
  });
});

userRouter.put("/profile", async (req, res) => {
  const parsed = UpdateProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  const sbToken = req.cookies?.sb_access_token as string | undefined;
  if (!sbToken) return res.status(401).json({ error: "unauthorized" });
  const sb = supabaseForUser(sbToken);
  const userId = req.user!.id;

  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.full_name = parsed.data.name;
  if (parsed.data.email !== undefined) patch.email = parsed.data.email;
  if (parsed.data.avatarUrl !== undefined) patch.avatar_url = parsed.data.avatarUrl;

  const { error } = await sb.from("profiles").upsert({ id: userId, ...patch });
  if (error) return res.status(400).json({ error: "update_failed", message: error.message });
  if (parsed.data.phone !== undefined || parsed.data.address !== undefined || parsed.data.name !== undefined || parsed.data.avatarUrl !== undefined) {
    await sb.auth.updateUser({
      data: {
        ...(parsed.data.name !== undefined ? { full_name: parsed.data.name } : {}),
        ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
        ...(parsed.data.address !== undefined ? { address: parsed.data.address } : {}),
        ...(parsed.data.avatarUrl !== undefined ? { avatar_url: parsed.data.avatarUrl } : {}),
      },
    });
  }
  return res.json({ ok: true });
});

userRouter.delete("/profile", async (req, res) => {
  const parsed = z.object({ confirmText: z.literal("DELETE") }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  const sbToken = req.cookies?.sb_access_token as string | undefined;
  if (!sbToken) return res.status(401).json({ error: "unauthorized" });
  const sb = supabaseForUser(sbToken);
  await sb.from("profiles").delete().eq("id", req.user!.id);
  res.clearCookie("access_token");
  res.clearCookie("sb_access_token");
  return res.json({ ok: true });
});

userRouter.get("/addresses", async (_req, res) => res.json({ addresses: [] }));
userRouter.post("/addresses", async (_req, res) => res.json({ addresses: [] }));
userRouter.put("/addresses/:addressId", async (_req, res) => res.json({ addresses: [] }));
userRouter.delete("/addresses/:addressId", async (_req, res) => res.json({ addresses: [] }));
