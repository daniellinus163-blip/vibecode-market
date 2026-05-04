"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/admin");

  const [email, setEmail] = useState("daniellinus163@gmail.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("next");
    if (q?.startsWith("/")) setNextPath(q);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/overview", { credentials: "include", cache: "no-store" }).then((r) => {
      if (!cancelled && r.ok) router.replace("/admin");
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; hint?: string };
      if (!res.ok) {
        setError(body.hint || body.error || `Login failed (${res.status})`);
        return;
      }
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-5 pb-24 pt-16 text-primary">
      <div className="rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
        <div className="text-xs tracking-[0.28em] text-black/55">ADMIN</div>
        <h1 className="mt-2 text-2xl font-semibold">Dashboard sign-in</h1>
        <p className="mt-2 text-sm text-black/65">
          This login is separate from shopper accounts. Only the configured admin email can continue.
        </p>

        {error ? <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div> : null}

        <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-black/60">Email</label>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-black/15 px-4 py-3 text-sm outline-none focus:border-accent/70"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-black/60">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-black/15 px-4 py-3 text-sm outline-none focus:border-accent/70"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-secondary disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in to dashboard"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-black/55">
          <Link href="/shop" className="text-accent underline-offset-4 hover:underline">
            Back to shop
          </Link>
        </p>
      </div>
    </main>
  );
}
