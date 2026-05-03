"use client";

import { useEffect, useState } from "react";
import { getPublicApiBase } from "@/lib/api";
import { getSupabaseClient } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Finishing Google sign-in...");
  const nextPath =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("next") || "/"
      : "/";

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error("supabase_missing");

        let session = (await supabase.auth.getSession()).data.session;
        if (!session?.access_token) {
          await new Promise((r) => setTimeout(r, 80));
          session = (await supabase.auth.getSession()).data.session;
        }
        const accessToken = session?.access_token;
        if (!accessToken) throw new Error("session_missing");

        const apiBase = getPublicApiBase();
        const syncUrl = `${apiBase}/api/auth/oauth/sync`;
        const res = await fetch(syncUrl, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ accessToken, rememberMe: true }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
          throw new Error(
            body.message ||
              body.error ||
              `Could not sync session (${res.status}). Run API on port 4000 from repo root or check server logs.`
          );
        }
        if (!alive) return;
        window.location.href = nextPath;
      } catch (e) {
        if (!alive) return;
        const hint =
          e instanceof Error
            ? e.message
            : "Google sign-in could not be completed. Run `npm run dev` from the repo root (starts Next + API), open the site at http://localhost:3000 (not 127.0.0.1), and add JWT_SECRET to server/.env.";
        setMessage(hint);
      }
    })();
    return () => {
      alive = false;
    };
  }, [nextPath]);

  return (
    <main className="mx-auto max-w-lg px-5 py-24">
      <div className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-black/80">{message}</div>
    </main>
  );
}
