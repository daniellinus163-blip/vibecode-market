"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { apiPost } from "@/lib/api";
import { getOAuthRedirectBase } from "@/lib/oauthRedirect";
import { getSupabaseClient, hasSupabasePublicEnv } from "@/lib/supabaseClient";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    setSuccess(null);
    if (password !== confirmPassword) {
      setError("Password confirmation does not match.");
      setBusy(false);
      return;
    }
    try {
      await apiPost("/api/auth/register", { name, email, password });
      setSuccess("Account created successfully. Redirecting...");
      window.setTimeout(() => {
        window.location.href = "/";
      }, 900);
    } catch {
      try {
        await apiPost("/api/auth/login", { email, password, rememberMe: true });
        setSuccess("Welcome back — we signed you in.");
        window.setTimeout(() => {
          window.location.href = "/";
        }, 900);
        return;
      } catch {
        setError("Account already exists. Please login or use a different email.");
      }
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
        redirectTo: `${getOAuthRedirectBase()}/auth/callback`,
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
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-primary">Sign up</h1>
        <p className="mt-2 text-sm text-black/70">Create your secure account for shopping and order tracking.</p>

        <div className="mt-6 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="w-full rounded-[18px] border border-black/15 bg-white px-4 py-3 text-sm text-black placeholder:text-black/40 outline-none transition focus:border-accent/70"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-[18px] border border-black/15 bg-white px-4 py-3 text-sm text-black placeholder:text-black/40 outline-none transition focus:border-accent/70"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (8+, uppercase, lowercase, number, symbol)"
            type="password"
            className="w-full rounded-[18px] border border-black/15 bg-white px-4 py-3 text-sm text-black placeholder:text-black/40 outline-none transition focus:border-accent/70"
          />
          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            type="password"
            className="w-full rounded-[18px] border border-black/15 bg-white px-4 py-3 text-sm text-black placeholder:text-black/40 outline-none transition focus:border-accent/70"
          />
        </div>

        {error ? <div className="mt-4 text-sm text-accent">{error}</div> : null}
        {success ? <div className="mt-4 text-sm text-emerald-600">{success}</div> : null}

        <button
          disabled={busy}
          onClick={submit}
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-secondary transition hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create account"}
        </button>
        <button
          disabled={googleBusy}
          onClick={googleSignIn}
          className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-black/20 bg-white px-6 py-3 text-sm font-semibold text-black transition hover:border-accent/60 disabled:opacity-60"
        >
          {googleBusy ? "Connecting..." : "Continue with Google"}
        </button>

        <div className="mt-5 text-sm text-black/70">
          Already have an account?{" "}
          <Link className="text-accent hover:underline underline-offset-4" href="/login">
            Login
          </Link>
        </div>
      </motion.div>
    </main>
  );
}

