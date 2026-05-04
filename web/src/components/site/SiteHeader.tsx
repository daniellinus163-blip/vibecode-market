"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { cartCount, useCartStore } from "@/store/cartStore";
import { getPublicApiBase } from "@/lib/api";
import { sameSiteImageSrc } from "@/lib/publicAssets";

const AVATAR_STORAGE_KEY = "vibecode_avatar_url";
const REMOVED_IMAGE_TOKEN = "78367fb2-5e83-4160-a25a-5b66808fa94f";
const REMOVED_IMAGE_TOKEN_2 = "7eb5b29f-3002-44bf-b060-48fdd7cda0a4";

export function SiteHeader() {
  const items = useCartStore((s) => s.items);
  const count = useMemo(() => cartCount(items), [items]);
  const [scrolled, setScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [showOwner, setShowOwner] = useState(false);

  function sanitizeAvatar(url: string) {
    if (!url) return "";
    if (url.includes(REMOVED_IMAGE_TOKEN)) return "";
    if (url.includes(REMOVED_IMAGE_TOKEN_2)) return "";
    if (url.startsWith("data:image/")) return "";
    return url;
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem("theme");
    const isDark = stored === "dark";
    setDarkMode(isDark);
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
  }, []);

  useEffect(() => {
    const localAvatar = window.localStorage.getItem(AVATAR_STORAGE_KEY) ?? "";
    const safe = sanitizeAvatar(localAvatar);
    if (localAvatar !== safe) window.localStorage.removeItem(AVATAR_STORAGE_KEY);
    if (safe) setAvatarUrl(safe);
    fetch(`${getPublicApiBase()}/api/user/profile`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((r) => {
        const url = sanitizeAvatar(String(r?.user?.avatarUrl ?? ""));
        if (typeof url === "string" && url.length > 0) setAvatarUrl(url);
      })
      .catch(() => {});
    const base = getPublicApiBase();
    fetch(`${base}/api/admin/overview`, { credentials: "include" })
      .then((r) => setShowAdmin(r.ok))
      .catch(() => setShowAdmin(false));
    fetch(`${base}/api/owner/session`, { credentials: "include" })
      .then((r) => setShowOwner(r.ok))
      .catch(() => setShowOwner(false));

    const onStorage = () => {
      const next = window.localStorage.getItem(AVATAR_STORAGE_KEY) ?? "";
      setAvatarUrl(sanitizeAvatar(next));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function toggleTheme() {
    setDarkMode((prev) => {
      const next = !prev;
      window.localStorage.setItem("theme", next ? "dark" : "light");
      document.documentElement.dataset.theme = next ? "dark" : "light";
      return next;
    });
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-black/10 backdrop-blur supports-[backdrop-filter]:bg-white/90",
        scrolled ? "bg-white/95" : "bg-white/85"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="group inline-flex items-baseline gap-2">
          <span className="text-lg font-semibold tracking-tight text-primary">VIBECODE</span>
          <span className="text-xs tracking-[0.2em] text-black/50 group-hover:text-accent transition-colors">
            MARKET
          </span>
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          <Link className="text-sm text-black/75 hover:text-black transition-colors" href="/">
            Home
          </Link>
          <details className="relative">
            <summary className="cursor-pointer list-none text-sm text-black/75 hover:text-black">Categories</summary>
            <div className="absolute left-0 top-7 w-44 rounded-xl border border-black/10 bg-white p-2 shadow-lg">
              {[
                ["Kids", "kids"],
                ["Teens", "teens"],
                ["Youth", "youth"],
                ["Adults", "adults"],
                ["Accessories", "accessories"],
              ].map(([label, value]) => (
                <Link key={value} href={`/shop?category=${value}`} className="block rounded-md px-3 py-2 text-sm text-black/80 hover:bg-black/5">
                  {label}
                </Link>
              ))}
            </div>
          </details>
          <Link className="text-sm text-black/75 hover:text-black transition-colors" href="/shop">
            Shop
          </Link>
          {showOwner ? (
            <Link className="text-sm text-black/75 hover:text-black transition-colors" href="/owner">
              Customers
            </Link>
          ) : null}
          {showAdmin ? (
            <Link className="text-sm text-black/75 hover:text-black transition-colors" href="/admin">
              Admin
            </Link>
          ) : null}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="inline-flex items-center justify-center rounded-full border border-black/15 bg-white px-3 py-2 text-sm text-black transition hover:border-accent/60"
            aria-label="Settings"
          >
            {avatarUrl ? (
              <img src={sameSiteImageSrc(avatarUrl)} alt="Profile" className="h-6 w-6 rounded-full object-cover" />
            ) : (
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-black/15 text-[12px]">⚙</span>
            )}
          </Link>
          <button
            onClick={toggleTheme}
            className="inline-flex items-center justify-center rounded-full border border-black/15 bg-white px-4 py-2 text-sm text-black transition hover:border-accent/60"
            aria-label="Toggle theme"
          >
            {darkMode ? "Light" : "Dark"}
          </button>
          <Link
            href="/cart"
            className="relative inline-flex items-center justify-center rounded-full border border-black/15 bg-white px-3 py-2 text-sm text-black transition hover:border-accent/60"
            aria-label="Cart"
          >
            <span className="text-accent">🛒</span>
            {count > 0 ? (
              <span className="absolute -right-2 -top-2 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-primary">
                {count}
              </span>
            ) : null}
          </Link>
        </div>
      </div>
    </header>
  );
}

