import { Router } from "express";
import { z } from "zod";
import { signAccessToken } from "../lib/jwt.js";
import { supabase } from "../lib/supabase.js";

export const authRouter = Router();

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

function setAuthCookie(res: any, token: string, rememberMe?: boolean) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("access_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
  });
}

function setSupabaseSessionCookie(res: any, token?: string, rememberMe?: boolean) {
  if (!token) return;
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("sb_access_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
  });
}

async function registerHandler(req: any, res: any) {
  if (!supabase) return res.status(500).json({ error: "supabase_not_configured" });
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });

  const { email, password, name } = parsed.data;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });
  if (error) {
    if (/already/i.test(error.message)) {
      // Smooth UX: if account exists and password matches, log user in.
      const signIn = await supabase.auth.signInWithPassword({ email, password });
      if (!signIn.error && signIn.data.user) {
        const token = signAccessToken({
          sub: signIn.data.user.id,
          role: "user",
          email: signIn.data.user.email ?? email,
          name: (signIn.data.user.user_metadata?.full_name as string) ?? name,
        });
        setAuthCookie(res, token, true);
        setSupabaseSessionCookie(res, signIn.data.session?.access_token, true);
        return res.json({ ok: true, existingUser: true });
      }
      return res.status(409).json({ error: "email_in_use" });
    }
    return res.status(400).json({ error: "signup_failed", message: error.message });
  }

  const userId = data.user?.id;
  if (!userId) return res.status(400).json({ error: "signup_failed" });
  const token = signAccessToken({ sub: userId, role: "user", email, name });
  setAuthCookie(res, token, true);
  setSupabaseSessionCookie(res, data.session?.access_token, true);

  return res.json({ ok: true });
}

authRouter.post("/signup", registerHandler);
authRouter.post("/register", registerHandler);

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

authRouter.post("/login", async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "supabase_not_configured" });
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input", message: "Check email/password format." });
  }

  const { email, password, rememberMe } = parsed.data;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    const msg = error?.message ?? "";
    if (/email not confirmed/i.test(msg)) {
      return res.status(403).json({ error: "email_not_confirmed", message: "Please confirm your email first." });
    }
    return res.status(401).json({ error: "invalid_credentials", message: "Invalid email or password." });
  }
  const token = signAccessToken({
    sub: data.user.id,
    role: "user",
    email: data.user.email ?? email,
    name: (data.user.user_metadata?.full_name as string) ?? "",
  });
  setAuthCookie(res, token, rememberMe);
  setSupabaseSessionCookie(res, data.session?.access_token, rememberMe);

  return res.json({ ok: true });
});

authRouter.post("/logout", async (req, res) => {
  if (supabase) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    if (token) {
      await supabase.auth.signOut();
    }
  }
  res.clearCookie("access_token");
  res.clearCookie("sb_access_token");
  return res.json({ ok: true });
});

authRouter.get("/me", async (req, res) => {
  const appToken = req.cookies?.access_token;
  if (!appToken) return res.status(401).json({ error: "unauthorized" });

  const { verifyAccessToken } = await import("../lib/jwt.js");
  let payload: { sub: string; role: "user" | "admin"; email?: string; name?: string };
  try {
    payload = verifyAccessToken(appToken);
  } catch {
    return res.status(401).json({ error: "unauthorized" });
  }

  return res.json({
    user: {
      _id: payload.sub,
      email: payload.email ?? "",
      name: payload.name ?? "",
      role: payload.role,
      addresses: [],
    },
  });
});
authRouter.post("/forgot-password", async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "supabase_not_configured" });
  const parsed = z.object({ email: z.string().trim().toLowerCase().email() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  const redirectTo = process.env.SUPABASE_RESET_REDIRECT_TO ?? "http://localhost:3000/login";
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });
  if (error) return res.status(400).json({ error: "reset_request_failed", message: error.message });
  return res.json({ ok: true });
});

authRouter.post("/reset-password", async (_req, res) => {
  return res.status(400).json({ error: "use_supabase_reset_link" });
});

authRouter.post("/oauth/sync", async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "supabase_not_configured" });
  const parsed = z.object({ accessToken: z.string().min(10), rememberMe: z.boolean().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });

  const { accessToken, rememberMe } = parsed.data;
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return res.status(401).json({ error: "invalid_oauth_session" });

  const user = data.user;
  const token = signAccessToken({
    sub: user.id,
    role: "user",
    email: user.email ?? "",
    name: (user.user_metadata?.full_name as string) ?? (user.user_metadata?.name as string) ?? "",
  });
  setAuthCookie(res, token, rememberMe);
  setSupabaseSessionCookie(res, accessToken, rememberMe);
  return res.json({ ok: true });
});

