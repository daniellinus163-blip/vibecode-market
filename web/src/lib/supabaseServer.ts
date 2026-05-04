import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const DEFAULT_OWNER_EMAIL = "daniellinus163@gmail.com";

export function createServiceSupabase() {
  if (!supabaseUrl || !supabaseServiceRoleKey) return null;
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createAnonSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** RLS queries as the logged-in user (pass Supabase session JWT from cookie). */
export function createUserScopedSupabase(sbAccessToken: string) {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${sbAccessToken}` } },
  });
}

function columnMissingFromPostgrest(msg: string, columnName: string) {
  const m = msg.toLowerCase();
  const col = columnName.toLowerCase();
  return m.includes(col) && (m.includes("does not exist") || m.includes("schema cache"));
}

export async function requireAdminUser() {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push("SUPABASE_URL");
  if (!supabaseAnonKey) missing.push("SUPABASE_ANON_KEY");
  const missingServiceRole = !supabaseServiceRoleKey;
  if (missingServiceRole) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length > 0) {
    // Allow degraded read-only admin mode when only service role key is missing.
    if (!(missing.length === 1 && missingServiceRole)) {
      return {
        ok: false as const,
        status: 500,
        error: `admin_env_missing:${missing.join(",")}`,
      };
    }
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("sb_access_token")?.value;
  if (!token) return { ok: false as const, status: 401, error: "unauthorized" };

  const anon = createAnonSupabase();
  const service = createServiceSupabase() ?? anon;
  if (!anon || !service) return { ok: false as const, status: 500, error: "admin_supabase_client_unavailable" };
  const { data: authData, error: authErr } = await anon.auth.getUser(token);
  if (authErr || !authData.user) return { ok: false as const, status: 401, error: "unauthorized" };

  const userId = authData.user.id;
  const email = (authData.user.email ?? "").toLowerCase();

  type AdminProfileRow = { id: string; email?: string | null; is_admin?: boolean | null };
  let profile: AdminProfileRow | null = null;
  const pr1 = await service.from("profiles").select("id,email,is_admin").eq("id", userId).maybeSingle();
  if (!pr1.error && pr1.data) profile = pr1.data as AdminProfileRow;
  else if (pr1.error && columnMissingFromPostgrest(pr1.error.message ?? "", "is_admin")) {
    const pr2 = await service.from("profiles").select("id,email").eq("id", userId).maybeSingle();
    if (!pr2.error && pr2.data) profile = { ...(pr2.data as AdminProfileRow), is_admin: false };
  }

  let inAdminUsersTable = false;
  const adminUsersRes = await service.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle();
  if (!adminUsersRes.error && adminUsersRes.data) inAdminUsersTable = true;

  const adminEmails = String(process.env.ADMIN_EMAILS ?? process.env.ADMIN_OWNER_EMAILS ?? DEFAULT_OWNER_EMAIL)
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

  const inAllowList = adminEmails.includes(email);
  const isAdmin =
    inAllowList ||
    inAdminUsersTable ||
    (Boolean(profile?.is_admin) && inAllowList) ||
    (missingServiceRole && adminEmails.length === 0); // dev fallback

  if (!isAdmin) return { ok: false as const, status: 403, error: "forbidden" };

  if (missingServiceRole) {
    return {
      ok: true as const,
      userId,
      email,
      service,
      degraded: true as const,
    };
  }
  return { ok: true as const, userId, email, service };
}

const OWNER_ACCOUNT_EMAIL = (process.env.OWNER_EMAIL ?? DEFAULT_OWNER_EMAIL).toLowerCase().trim();

/**
 * Strict gate: only the configured owner Gmail can call owner-only APIs (customer list).
 * Requires service role so `auth.admin.listUsers` can run.
 */
export async function requireOwnerUser() {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push("SUPABASE_URL");
  if (!supabaseAnonKey) missing.push("SUPABASE_ANON_KEY");
  if (!supabaseServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length > 0) {
    return { ok: false as const, status: 500, error: `owner_env_missing:${missing.join(",")}` };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("sb_access_token")?.value;
  if (!token) return { ok: false as const, status: 401, error: "unauthorized" };

  const anon = createAnonSupabase();
  const service = createServiceSupabase();
  if (!anon || !service) return { ok: false as const, status: 500, error: "owner_supabase_client_unavailable" };

  const { data: authData, error: authErr } = await anon.auth.getUser(token);
  if (authErr || !authData.user) return { ok: false as const, status: 401, error: "unauthorized" };

  const userId = authData.user.id;
  const email = (authData.user.email ?? "").toLowerCase().trim();

  if (email !== OWNER_ACCOUNT_EMAIL) return { ok: false as const, status: 403, error: "forbidden" };

  return { ok: true as const, userId, email, service };
}
