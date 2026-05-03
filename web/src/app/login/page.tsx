"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { apiPost, getPublicApiBase } from "@/lib/api";
import { getOAuthRedirectBase } from "@/lib/oauthRedirect";
import { getSupabaseClient, hasSupabasePublicEnv } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const nextPath =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("next") || "/account"
      : "/account";

  async function submit() {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${getPublicApiBase()}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        if (body.error === "email_not_confirmed") {
          throw new Error("Please confirm your email first. Check your inbox/spam.");
        }
        if (body.error === "invalid_input") {
          throw new Error("Use a valid email and password.");
        }
        throw new Error(body.message || "Invalid email or password.");
      }
      setSuccess("Login successful. Redirecting...");
      window.location.href = nextPath;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid email or password.");
    } finally {
      setBusy(false);
    }
  }

  async function googleSignIn() {
    setError(null);
    setSuccess(null);
    if (!hasSupabasePublicEnv) {
      setError("Supabase public env is missing.");
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Supabase client is not available.");
      return;
    }
    setGoogleBusy(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${getOAuthRedirectBase()}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });
    if (oauthError) {
      setError("Google sign-in failed. Please try again.");
      setGoogleBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-5 pb-24 pt-14">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
        className="rounded-[28px] border border-black/10 bg-white p-7 shadow-luxe"
      >
        <div className="text-xs tracking-[0.3em] text-black/60">ACCESS</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-primary">Login</h1>
        <p className="mt-2 text-sm text-black/70">Secure access to your account and orders.</p>

        <div className="mt-6 space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-[18px] border border-black/15 bg-white px-4 py-3 text-sm text-black placeholder:text-black/40 outline-none transition focus:border-accent/70"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            className="w-full rounded-[18px] border border-black/15 bg-white px-4 py-3 text-sm text-black placeholder:text-black/40 outline-none transition focus:border-accent/70"
          />
          <label className="inline-flex items-center gap-2 text-sm text-black/70">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
            Remember me
          </label>
        </div>

        {error ? <div className="mt-4 text-sm text-accent">{error}</div> : null}
        {success ? <div className="mt-4 text-sm text-emerald-600">{success}</div> : null}

        <button
          disabled={busy}
          onClick={submit}
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-secondary transition hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Login"}
        </button>
        <button
          disabled={googleBusy}
          onClick={googleSignIn}
          className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-black/20 bg-white px-6 py-3 text-sm font-semibold text-black transition hover:border-accent/60 disabled:opacity-60"
        >
          {googleBusy ? "Connecting..." : "Continue with Google"}
        </button>

        <div className="mt-5 flex items-center justify-between text-sm text-black/70">
          New here?{" "}
          <Link className="text-accent hover:underline underline-offset-4" href="/signup">
            Create an account
          </Link>
          <button
            onClick={async () => {
              if (!email) return setError("Enter your email to receive reset token.");
              const r = await apiPost<{ resetToken?: string }>("/api/auth/forgot-password", { email });
              setSuccess(r.resetToken ? `Reset token: ${r.resetToken}` : "If email exists, reset link sent.");
            }}
            className="text-accent hover:underline underline-offset-4"
          >
            Forgot password?
          </button>
        </div>
      </motion.div>
    </main>
  );
}

