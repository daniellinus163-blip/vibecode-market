"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ALL_CLOTH_IMAGE_IDS, clothImageById } from "@/lib/catalogImages";
import { getOAuthRedirectBase } from "@/lib/oauthRedirect";
import { getSupabaseClient, hasSupabasePublicEnv } from "@/lib/supabaseClient";
import { getPublicApiBase } from "@/lib/api";

export function Hero() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const looks = useMemo(
    () => [
      {
        label: "Kids",
        left: clothImageById(11),
        right: clothImageById(12),
      },
      {
        label: "Teens",
        left: clothImageById(13),
        right: clothImageById(17),
      },
      {
        label: "Youth",
        left: clothImageById(20),
        right: clothImageById(22),
      },
      {
        label: "Adults",
        left: clothImageById(24),
        right: clothImageById(25),
      },
    ],
    []
  );
  const sliderImages = useMemo(
    () => ALL_CLOTH_IMAGE_IDS.map((id) => clothImageById(id)),
    []
  );
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setIdx((x) => (x + 1) % looks.length), 2400);
    return () => window.clearInterval(id);
  }, [looks.length]);
  useEffect(() => {
    fetch(`${getPublicApiBase()}/api/auth/me`, { credentials: "include" })
      .then((r) => setIsLoggedIn(r.ok))
      .catch(() => setIsLoggedIn(false));
  }, []);
  const images = looks[idx];

  async function signInWithGoogle() {
    setGoogleError(null);
    if (!hasSupabasePublicEnv) {
      setGoogleError("Supabase public env is missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      setGoogleError("Supabase client is not available.");
      return;
    }
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${getOAuthRedirectBase()}/auth/callback`,
      },
    });
    if (error) {
      setGoogleError("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  }

  return (
    <section className="mx-auto mb-4 mt-4 max-w-7xl px-4">
      <div className="relative h-[42vh] min-h-[250px] overflow-hidden rounded-2xl border border-black/10">
        <div className="grid h-full grid-cols-2">
          <div className="relative">
            <Image src={images.left} alt="Featured clothing left" fill priority quality={100} unoptimized className="object-contain bg-white" />
          </div>
          <div className="relative">
            <Image src={images.right} alt="Featured clothing right" fill priority quality={100} unoptimized className="object-contain bg-white" />
          </div>
        </div>
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-white">
          <p className="text-xs tracking-[0.2em] text-white/90">MARKETPLACE DEALS</p>
          <h1 className="mt-2 text-2xl font-semibold md:text-4xl">Shop fashion for every age group</h1>
          <p className="mt-2 text-sm text-white/90">Now showing: {images.label} style looks</p>
          <div className="mt-4 flex gap-2">
            <Link href="/shop" className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-primary">
              Shop Now
            </Link>
            <Link href="/shop?sort=popular" className="rounded-full border border-white/70 bg-black/35 px-5 py-2 text-sm font-semibold text-white backdrop-blur-sm">
              Top Rated
            </Link>
            {!isLoggedIn ? (
              <button
                onClick={signInWithGoogle}
                disabled={googleLoading}
                className="rounded-full border border-white/80 bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {googleLoading ? "Connecting..." : "Continue with Google"}
              </button>
            ) : null}
          </div>
          {googleError ? <p className="mt-2 text-xs text-rose-200">{googleError}</p> : null}
        </div>
      </div>
      <div className="mt-3 overflow-hidden rounded-xl border border-black/10 bg-white p-2">
        <div className="flex animate-[scrollx_24s_linear_infinite] gap-2">
          {sliderImages.concat(sliderImages).map((src, i) => (
            <div key={src + i} className="relative h-24 w-40 shrink-0 overflow-hidden rounded-lg border border-black/10">
              <Image src={src} alt={`cloth ${i + 1}`} fill quality={100} unoptimized className="object-contain bg-white" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

