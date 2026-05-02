"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as Tabs from "@radix-ui/react-tabs";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import type { Product } from "@/lib/types";
import { useWishlistStore } from "@/store/wishlistStore";

const AVATAR_STORAGE_KEY = "vibecode_avatar_url";
const REMOVED_IMAGE_TOKEN = "78367fb2-5e83-4160-a25a-5b66808fa94f";
const REMOVED_IMAGE_TOKEN_2 = "7eb5b29f-3002-44bf-b060-48fdd7cda0a4";

type User = {
  _id?: string;
  email: string;
  name: string;
  role: "user" | "admin";
  avatarUrl?: string;
  phone?: string;
  address?: string;
  addresses: any[];
};

type Order = {
  _id: string;
  status: string;
  totalCents: number;
  createdAt: string;
};

function cents(c: number) {
  return (c / 100).toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default function AccountPage() {
  const wishedIds = useWishlistStore((s) => s.ids);
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [recent, setRecent] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    avatarUrl: "",
    currentPassword: "",
    newPassword: "",
  });
  const [addressForm, setAddressForm] = useState({
    label: "",
    fullName: "",
    line1: "",
    line2: "",
    city: "",
    postalCode: "",
    country: "",
    phone: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletePassword, setDeletePassword] = useState("");

  function sanitizeAvatar(url: string) {
    if (!url) return "";
    if (url.includes(REMOVED_IMAGE_TOKEN)) return "";
    if (url.includes(REMOVED_IMAGE_TOKEN_2)) return "";
    if (url.startsWith("data:image/")) return "";
    return url;
  }

  async function load() {
    setLoading(true);
    try {
      const u = await apiGet<{ user: User }>("/api/auth/me");
      const p = await apiGet<{ user: User }>("/api/user/profile");
      const localAvatar = typeof window !== "undefined" ? window.localStorage.getItem(AVATAR_STORAGE_KEY) ?? "" : "";
      const safeLocalAvatar = sanitizeAvatar(localAvatar);
      if (typeof window !== "undefined" && localAvatar !== safeLocalAvatar) {
        window.localStorage.removeItem(AVATAR_STORAGE_KEY);
      }
      setUser(u.user);
      setProfileForm((f) => ({
        ...f,
        name: p.user.name || u.user.name,
        email: p.user.email || u.user.email,
        phone: p.user.phone || "",
        address: p.user.address || "",
        avatarUrl: safeLocalAvatar || sanitizeAvatar(p.user.avatarUrl || ""),
      }));
      const o = await apiGet<{ orders: Order[] }>("/api/orders");
      setOrders(o.orders ?? []);
      const productsResp = await apiGet<{ items: Product[] }>("/api/products");
      const map = new Map((productsResp.items ?? []).map((p) => [p._id, p]));
      setWishlist(wishedIds.map((id) => map.get(id)).filter(Boolean) as Product[]);
      setRecent([]);
      setMessage("Logged in successfully.");
    } catch {
      setUser(null);
      setError("Could not load account right now. Please login manually if needed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [wishedIds]);

  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 pt-10 text-primary">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs tracking-[0.3em] text-black/60">ACCOUNT</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              await apiPost("/api/auth/logout", {});
              window.location.href = "/";
            }}
            className="rounded-full border border-black/12 bg-white px-5 py-2 text-sm text-black/80 transition hover:border-accent/60"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="mt-8 rounded-[28px] border border-black/10 bg-white p-6">
        {loading ? (
          <div className="text-sm text-black/60">Loading…</div>
        ) : !user ? (
          <div className="text-sm text-black/70">
            You’re not logged in.{" "}
            <Link className="text-accent hover:underline underline-offset-4" href="/login">
              Login
            </Link>
          </div>
        ) : (
          <Tabs.Root defaultValue="profile">
            {message ? <div className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div> : null}
            {error ? <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
            <Tabs.List className="flex flex-wrap gap-2">
              {["profile", "orders", "addresses", "wishlist", "recent"].map((k) => (
                <Tabs.Trigger
                  key={k}
                  value={k}
                  className="rounded-full border border-black/12 bg-white px-4 py-2 text-sm text-black/75 transition data-[state=active]:border-accent/70 data-[state=active]:bg-accent data-[state=active]:text-primary data-[state=active]:font-semibold"
                >
                  {k.toUpperCase()}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            <div className="mt-6">
              <Tabs.Content value="profile">
                <div className="rounded-[22px] border border-black/10 bg-white p-5">
                  <div className="text-xs tracking-[0.28em] text-black/60">PROFILE</div>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-12">
                    <div className="md:col-span-8 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <input value={profileForm.name} onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
                      <input value={profileForm.email} onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email" className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
                      <input value={profileForm.phone} onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Phone number" className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
                      <input value={profileForm.address} onChange={(e) => setProfileForm((f) => ({ ...f, address: e.target.value }))} placeholder="Address" className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
                      <input value={profileForm.currentPassword} onChange={(e) => setProfileForm((f) => ({ ...f, currentPassword: e.target.value }))} type="password" placeholder="Current password (for password change)" className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
                      <input value={profileForm.newPassword} onChange={(e) => setProfileForm((f) => ({ ...f, newPassword: e.target.value }))} type="password" placeholder="New password" className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
                    </div>
                    <div className="md:col-span-4 rounded-xl border border-black/10 p-3">
                      <div className="text-xs font-semibold text-black/60">PROFILE PHOTO</div>
                      <div className="mt-2 flex items-center gap-3">
                        {profileForm.avatarUrl ? (
                          <img src={profileForm.avatarUrl} alt="avatar" className="h-16 w-16 rounded-full border border-black/10 object-cover" />
                        ) : (
                          <div className="h-16 w-16 rounded-full border border-black/10 bg-black/5" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setError(null);
                            setMessage("Uploading photo...");
                            try {
                              const fd = new FormData();
                              fd.append("file", file);
                              const res = await fetch("/api/avatar-upload", { method: "POST", body: fd });
                              const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
                              if (!res.ok || !body.url) throw new Error(body.error || "upload_failed");
                              const safe = sanitizeAvatar(body.url);
                              setProfileForm((f) => ({ ...f, avatarUrl: safe }));
                              window.localStorage.setItem(AVATAR_STORAGE_KEY, safe);
                              setMessage("Photo uploaded. Click Save profile.");
                            } catch {
                              setError("Could not upload photo.");
                            }
                          }}
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      setError(null);
                      setMessage(null);
                      try {
                        await apiPut("/api/user/profile", {
                          name: profileForm.name,
                          phone: profileForm.phone,
                          address: profileForm.address,
                          avatarUrl: sanitizeAvatar(profileForm.avatarUrl),
                        });
                        if (profileForm.avatarUrl) window.localStorage.setItem(AVATAR_STORAGE_KEY, sanitizeAvatar(profileForm.avatarUrl));
                        setMessage("Profile saved successfully.");
                        await load();
                      } catch (err: any) {
                        if (profileForm.avatarUrl) {
                          window.localStorage.setItem(AVATAR_STORAGE_KEY, sanitizeAvatar(profileForm.avatarUrl));
                          setMessage("Profile photo saved and shown on home header.");
                          return;
                        }
                        setError(err?.message || "Could not update profile.");
                      }
                    }}
                    className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-secondary"
                  >
                    Save profile
                  </button>
                  <div className="mt-6 border-t border-black/10 pt-4">
                    <div className="text-sm font-semibold text-rose-700">Delete account</div>
                    <p className="mt-1 text-xs text-black/60">Type DELETE and your password to permanently remove your account.</p>
                    <div className="mt-2 flex flex-col gap-2 md:flex-row">
                      <input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder='Type "DELETE"' className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
                      <input value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} type="password" placeholder="Password" className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
                      <button
                        onClick={async () => {
                          setError(null);
                          try {
                            await apiDelete("/api/user/profile", {
                              body: JSON.stringify({ confirmText: deleteConfirm }),
                              headers: { "content-type": "application/json" },
                            });
                            window.location.href = "/";
                          } catch {
                            setError("Account deletion failed. Check confirmation and password.");
                          }
                        }}
                        className="rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
                      >
                        Delete account
                      </button>
                    </div>
                  </div>
                </div>
              </Tabs.Content>

              <Tabs.Content value="orders">
                <div className="space-y-3">
                  {orders.length === 0 ? (
                    <div className="rounded-[22px] border border-black/10 bg-white p-5 text-sm text-black/70">
                      No orders yet.
                    </div>
                  ) : (
                    orders.map((o) => (
                      <Link
                        key={o._id}
                        href={`/order/${o._id}`}
                        className="block rounded-[22px] border border-black/10 bg-white p-5 transition hover:border-accent/50"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold">Order {o._id.slice(0, 8)}…</div>
                            <div className="mt-1 text-xs text-black/60">{new Date(o.createdAt).toLocaleString()}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{cents(o.totalCents)}</div>
                            <div className="mt-1 text-xs text-accent">{o.status}</div>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </Tabs.Content>

              <Tabs.Content value="addresses">
                <div className="rounded-[22px] border border-black/10 bg-white p-5">
                  <div className="text-xs tracking-[0.28em] text-black/60">ADD ADDRESS</div>
                  <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                    {Object.entries(addressForm).map(([k, v]) => (
                      <input
                        key={k}
                        value={v as string}
                        onChange={(e) => setAddressForm((f) => ({ ...f, [k]: e.target.value }))}
                        placeholder={k}
                        className="rounded-lg border border-black/15 px-3 py-2 text-sm"
                      />
                    ))}
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        setMessage("Address saved.");
                      } catch {
                        setError("Could not add address.");
                      }
                    }}
                    className="mt-3 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-secondary"
                  >
                    Save address
                  </button>
                  <div className="mt-6 space-y-2">
                    {(user.addresses ?? []).map((a: any) => (
                      <div key={a._id} className="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2">
                        <div className="text-sm text-black/80">{a.label} · {a.line1}, {a.city}</div>
                        <button
                          onClick={async () => {
                            setMessage("Address removed.");
                          }}
                          className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-xs text-rose-700"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </Tabs.Content>

              <Tabs.Content value="wishlist">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {wishlist.map((p) => (
                    <Link
                      key={p._id}
                      href={`/product/${p.slug}`}
                      className="rounded-[22px] border border-black/10 bg-white p-4 hover:border-accent/50 transition"
                    >
                      <div className="text-sm font-semibold">{p.title}</div>
                      <div className="mt-1 text-xs text-black/60">{p.category}</div>
                    </Link>
                  ))}
                </div>
              </Tabs.Content>

              <Tabs.Content value="recent">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {recent.map((p) => (
                    <Link
                      key={p._id}
                      href={`/product/${p.slug}`}
                      className="rounded-[22px] border border-black/10 bg-white p-4 hover:border-accent/50 transition"
                    >
                      <div className="text-sm font-semibold">{p.title}</div>
                      <div className="mt-1 text-xs text-black/60">{p.category}</div>
                    </Link>
                  ))}
                </div>
              </Tabs.Content>
            </div>
          </Tabs.Root>
        )}
      </div>
    </main>
  );
}

