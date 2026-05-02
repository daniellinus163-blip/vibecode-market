"use client";

import { useLayoutEffect } from "react";

/**
 * Supabase sometimes redirects to Site URL root (/[#access_token=…]) instead of /auth/callback.
 * Move hash/query tokens onto /auth/callback so our handler runs and cookies sync with Express.
 */
export function SupabaseOAuthRecovery() {
  useLayoutEffect(() => {
    const { pathname, search, hash } = window.location;

    if (pathname === "/auth/callback") return;

    const qs = new URLSearchParams(search);
    if (qs.has("code")) {
      window.location.replace(`/auth/callback${search}`);
      return;
    }

    if (!hash || hash.length < 10) return;
    const hp = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    if (!hp.has("access_token") && !hp.has("error")) return;

    window.location.replace(`/auth/callback${search}${hash}`);
  }, []);

  return null;
}

