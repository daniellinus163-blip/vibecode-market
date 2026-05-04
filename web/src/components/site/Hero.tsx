"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ALL_CLOTH_IMAGE_IDS, clothImageById } from "@/lib/catalogImages";
import { getPublicApiBase } from "@/lib/api";
import { getSupabaseClient, hasSupabasePublicEnv } from "@/lib/supabaseClient";

export function Hero() {
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
    let cancelled = false;
    const supabase = hasSupabasePublicEnv ? getSupabaseClient() : null;

    async function fromApi(): Promise<boolean> {
      try {
        const r = await fetch(`${getPublicApiBase()}/api/auth/me`, { credentials: "include", cache: "no-store" });
        return r.ok;
      } catch {
        return false;
      }
    }

    async function fromSupabase(): Promise<boolean> {
      if (!supabase) return false;
      const { data } = await supabase.auth.getSession();
      return Boolean(data.session?.access_token);
    }

    async function refresh() {
      if (cancelled) return;
      const apiOk = await fromApi();
      if (cancelled) return;
      if (apiOk) {
        setIsLoggedIn(true);
        return;
      }
      const sbOk = await fromSupabase();
      if (!cancelled) setIsLoggedIn(sbOk);
    }

    void refresh();
    const retry = window.setTimeout(() => void refresh(), 350);

    const sub = supabase?.auth.onAuthStateChange(() => {
      void refresh();
    });

    function onFocus() {
      void refresh();
    }
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearTimeout(retry);
      sub?.data.subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const images = looks[idx];

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
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Link href="/shop" className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-primary">
              Shop Now
            </Link>
            <Link href="/shop?sort=popular" className="rounded-full border border-white/70 bg-black/35 px-5 py-2 text-sm font-semibold text-white backdrop-blur-sm">
              Top Rated
            </Link>
            {!isLoggedIn ? (
              <Link
                href="/login"
                className="rounded-full border border-white/80 bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                Sign in
              </Link>
            ) : null}
          </div>
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
