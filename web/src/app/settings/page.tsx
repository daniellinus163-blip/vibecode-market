"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  email?: string | null;
  updated_at?: string | null;
};

type AddressRow = {
  id: string;
  user_id: string;
  full_name: string;
  phone_number: string;
  address_line: string;
  city: string;
  state: string;
  is_default: boolean;
  created_at: string;
};

type OrderRow = {
  id: string;
  status: string;
  created_at: string;
  total?: number;
  items?: Array<{ product_name?: string; quantity?: number }>;
};

type WishlistRow = {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  products?: { id: string; name: string; image_url: string; category: string; price: number } | null;
};

type NotificationPrefs = {
  order_updates: boolean;
  promotions: boolean;
  new_arrivals: boolean;
};

const AVATAR_STORAGE_KEY = "vibecode_avatar_url";
const LOCAL_PROFILE_KEY = "vibecode_profile_fallback";
const LOCAL_NOTIFICATION_KEY = "vibecode_notification_settings";
const LOCAL_ADDRESSES_KEY = "vibecode_addresses";
const LOCAL_WISHLIST_KEY = "vibecode_wishlist";

function isMissingTableError(msg?: string) {
  const m = String(msg ?? "").toLowerCase();
  return m.includes("could not find the table") || m.includes("schema cache") || m.includes("does not exist");
}

function isMissingColumnError(msg?: string) {
  const m = String(msg ?? "").toLowerCase();
  return m.includes("could not find the") && m.includes("column");
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [tab, setTab] = useState<"profile" | "addresses" | "orders" | "wishlist" | "notifications" | "security">("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");

  const [profile, setProfile] = useState<ProfileRow>({
    id: "",
    full_name: "",
    username: "",
    avatar_url: "",
    email: "",
    updated_at: "",
  });
  const [addresses, setAddresses] = useState<AddressRow[]>([]);
  const [addressForm, setAddressForm] = useState<Omit<AddressRow, "id" | "user_id" | "created_at">>({
    full_name: "",
    phone_number: "",
    address_line: "",
    city: "",
    state: "",
    is_default: false,
  });
  const [editingAddressId, setEditingAddressId] = useState<string>("");

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [wishlist, setWishlist] = useState<WishlistRow[]>([]);
  const [wishlistProductId, setWishlistProductId] = useState("");
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>({
    order_updates: true,
    promotions: true,
    new_arrivals: true,
  });
  const [newPassword, setNewPassword] = useState("");

  const tabs = useMemo(
    () => [
      ["profile", "Profile"],
      ["addresses", "Addresses"],
      ["orders", "Orders"],
      ["wishlist", "Wishlist"],
      ["notifications", "Notifications"],
      ["security", "Security"],
    ] as const,
    []
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      if (!supabase) {
        setError("Supabase is not configured for the web app.");
        setLoading(false);
        return;
      }
      const auth = await supabase.auth.getUser();
      const user = auth.data.user;
      if (!user) {
        router.replace("/login?next=/settings");
        return;
      }
      setUserId(user.id);
      setUserEmail(user.email ?? "");
      await Promise.all([
        loadProfile(user.id, user.email ?? ""),
        loadAddresses(user.id),
        loadOrders(user.id),
        loadWishlist(user.id),
        loadNotifications(user.id),
      ]);
      setLoading(false);
    })().catch(() => {
      setError("Could not load settings.");
      setLoading(false);
    });
  }, [router, supabase]);

  async function loadProfile(uid: string, email: string) {
    if (!supabase) return;
    const { data, error } = await supabase.from("profiles").select("id,full_name,username,avatar_url,updated_at,email").eq("id", uid).maybeSingle();
    if (error && isMissingColumnError(error.message)) {
      const [basic, authUser] = await Promise.all([
        supabase.from("profiles").select("id").eq("id", uid).maybeSingle(),
        supabase.auth.getUser(),
      ]);
      if (!basic.error) {
        const meta = (authUser.data.user?.user_metadata ?? {}) as Record<string, unknown>;
        let local: Record<string, string> = {};
        if (typeof window !== "undefined") {
          try {
            local = JSON.parse(window.localStorage.getItem(LOCAL_PROFILE_KEY) ?? "{}") as Record<string, string>;
          } catch {}
        }
        setProfile({
          id: uid,
          full_name: String(meta.full_name ?? local.full_name ?? ""),
          username: String(meta.username ?? local.username ?? ""),
          avatar_url: String(
            meta.avatar_url ??
              (typeof window !== "undefined" ? window.localStorage.getItem(AVATAR_STORAGE_KEY) ?? "" : "") ??
              local.avatar_url ??
              ""
          ),
          updated_at: "",
          email,
        });
        return;
      }
    }
    setProfile({
      id: uid,
      full_name: data?.full_name ?? "",
      username: data?.username ?? "",
      avatar_url: data?.avatar_url ?? (typeof window !== "undefined" ? window.localStorage.getItem(AVATAR_STORAGE_KEY) ?? "" : ""),
      updated_at: data?.updated_at ?? "",
      email: data?.email ?? email,
    });
  }

  async function loadAddresses(uid: string) {
    if (!supabase) return;
    const { data, error } = await supabase.from("addresses").select("*").eq("user_id", uid).order("is_default", { ascending: false }).order("created_at", { ascending: false });
    if (error && isMissingTableError(error.message)) {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem(LOCAL_ADDRESSES_KEY);
        if (raw) {
          try {
            setAddresses(JSON.parse(raw) as AddressRow[]);
            return;
          } catch {}
        }
      }
      setAddresses([]);
      return;
    }
    setAddresses((data ?? []) as AddressRow[]);
  }

  async function loadOrders(uid: string) {
    if (!supabase) return;
    const { data } = await supabase
      .from("orders")
      .select("id,status,created_at,total,order_items(quantity,products(name))")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!data || data.length === 0) {
      setOrders([
        { id: "demo-001", status: "pending", created_at: new Date().toISOString(), total: 25000, items: [{ product_name: "Premium Denim Jacket", quantity: 1 }] },
      ]);
      return;
    }
    const mapped = (data as any[]).map((o) => ({
      id: String(o.id),
      status: String(o.status ?? "pending"),
      created_at: String(o.created_at),
      total: Number(o.total ?? 0),
      items: (o.order_items ?? []).map((i: any) => ({ product_name: i?.products?.name ?? "Item", quantity: Number(i?.quantity ?? 1) })),
    }));
    setOrders(mapped);
  }

  async function loadWishlist(uid: string) {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("wishlist")
      .select("id,user_id,product_id,created_at,products(id,name,image_url,category,price)")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (error && isMissingTableError(error.message)) {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem(LOCAL_WISHLIST_KEY);
        if (raw) {
          try {
            setWishlist(JSON.parse(raw) as WishlistRow[]);
            return;
          } catch {}
        }
      }
      setWishlist([]);
      return;
    }
    setWishlist((data ?? []) as WishlistRow[]);
  }

  async function loadNotifications(uid: string) {
    if (!supabase) return;
    const { data, error } = await supabase.from("notification_settings").select("order_updates,promotions,new_arrivals").eq("user_id", uid).maybeSingle();
    if (error && isMissingTableError(error.message)) {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem(LOCAL_NOTIFICATION_KEY);
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as NotificationPrefs;
            setNotificationPrefs(parsed);
          } catch {}
        }
      }
      return;
    }
    if (data) setNotificationPrefs(data as NotificationPrefs);
  }

  async function uploadAvatar(file?: File) {
    if (!file) return;
    setMessage(null);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/avatar-upload", { method: "POST", body: fd });
    const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !body.url) {
      setError(body.error || "Avatar upload failed.");
      return;
    }
    setProfile((p) => ({ ...p, avatar_url: body.url! }));
    if (typeof window !== "undefined") window.localStorage.setItem(AVATAR_STORAGE_KEY, body.url);
    setMessage("Avatar uploaded. Click Save Profile.");
  }

  async function saveProfile() {
    if (!supabase || !userId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    let patch: Record<string, unknown> = {
      full_name: profile.full_name || null,
      username: profile.username || null,
      avatar_url: profile.avatar_url || null,
      email: userEmail,
      updated_at: new Date().toISOString(),
    };
    let { error: e1 } = await supabase.from("profiles").upsert({ id: userId, ...patch });
    if (e1 && isMissingColumnError(e1.message)) {
      ({ error: e1 } = await supabase.from("profiles").upsert({ id: userId, email: userEmail }));
      const metaPayload = {
        full_name: String(profile.full_name ?? ""),
        username: String(profile.username ?? ""),
        avatar_url: String(profile.avatar_url ?? ""),
      };
      const metaRes = await supabase.auth.updateUser({
        email: String(profile.email ?? "").trim() || undefined,
        data: metaPayload,
      });
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(metaPayload));
        if (metaPayload.avatar_url) window.localStorage.setItem(AVATAR_STORAGE_KEY, metaPayload.avatar_url);
      }
      if (!e1 && !metaRes.error) {
        setMessage("Profile saved successfully.");
        setSaving(false);
        return;
      }
      if (!e1 && metaRes.error) {
        setError(metaRes.error.message || "Failed to update profile.");
        setSaving(false);
        return;
      }
    }
    const { error: e2 } = await supabase.auth.updateUser({ email: String(profile.email ?? "").trim() || undefined });
    if (e1 || e2) setError(e1?.message || e2?.message || "Failed to update profile.");
    else setMessage("Profile updated successfully.");
    setSaving(false);
  }

  async function saveAddress() {
    if (!supabase || !userId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    if (addressForm.is_default) await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
    if (editingAddressId) {
      const { error } = await supabase.from("addresses").update(addressForm).eq("id", editingAddressId).eq("user_id", userId);
      if (error && isMissingTableError(error.message)) {
        if (typeof window !== "undefined") {
          const current = JSON.parse(window.localStorage.getItem(LOCAL_ADDRESSES_KEY) ?? "[]") as AddressRow[];
          const next = current.map((a) => (a.id === editingAddressId ? { ...a, ...addressForm } : a));
          window.localStorage.setItem(LOCAL_ADDRESSES_KEY, JSON.stringify(next));
          setAddresses(next);
          setMessage("Address updated.");
        }
      } else if (error) setError(error.message);
      else setMessage("Address updated.");
    } else {
      const { error } = await supabase.from("addresses").insert({ ...addressForm, user_id: userId });
      if (error && isMissingTableError(error.message)) {
        if (typeof window !== "undefined") {
          const current = JSON.parse(window.localStorage.getItem(LOCAL_ADDRESSES_KEY) ?? "[]") as AddressRow[];
          const localRow: AddressRow = {
            id: `local-${Date.now()}`,
            user_id: userId,
            full_name: addressForm.full_name,
            phone_number: addressForm.phone_number,
            address_line: addressForm.address_line,
            city: addressForm.city,
            state: addressForm.state,
            is_default: addressForm.is_default,
            created_at: new Date().toISOString(),
          };
          const next = [localRow, ...current];
          window.localStorage.setItem(LOCAL_ADDRESSES_KEY, JSON.stringify(next));
          setAddresses(next);
          setMessage("Address added.");
        }
      } else if (error) setError(error.message);
      else setMessage("Address added.");
    }
    setAddressForm({ full_name: "", phone_number: "", address_line: "", city: "", state: "", is_default: false });
    setEditingAddressId("");
    await loadAddresses(userId);
    setSaving(false);
  }

  async function setDefaultAddress(id: string) {
    if (!supabase || !userId) return;
    const a = await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
    const b = await supabase.from("addresses").update({ is_default: true }).eq("id", id).eq("user_id", userId);
    if ((a.error && isMissingTableError(a.error.message)) || (b.error && isMissingTableError(b.error.message))) {
      if (typeof window !== "undefined") {
        const current = JSON.parse(window.localStorage.getItem(LOCAL_ADDRESSES_KEY) ?? "[]") as AddressRow[];
        const next = current.map((x) => ({ ...x, is_default: x.id === id }));
        window.localStorage.setItem(LOCAL_ADDRESSES_KEY, JSON.stringify(next));
        setAddresses(next);
        return;
      }
    }
    await loadAddresses(userId);
  }

  async function deleteAddress(id: string) {
    if (!supabase || !userId) return;
    const { error } = await supabase.from("addresses").delete().eq("id", id).eq("user_id", userId);
    if (error && isMissingTableError(error.message)) {
      if (typeof window !== "undefined") {
        const current = JSON.parse(window.localStorage.getItem(LOCAL_ADDRESSES_KEY) ?? "[]") as AddressRow[];
        const next = current.filter((x) => x.id !== id);
        window.localStorage.setItem(LOCAL_ADDRESSES_KEY, JSON.stringify(next));
        setAddresses(next);
        return;
      }
    }
    await loadAddresses(userId);
  }

  async function addWishlistItem() {
    if (!supabase || !userId || !wishlistProductId.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("wishlist").insert({ user_id: userId, product_id: wishlistProductId.trim() });
    if (error && isMissingTableError(error.message)) {
      if (typeof window !== "undefined") {
        const current = JSON.parse(window.localStorage.getItem(LOCAL_WISHLIST_KEY) ?? "[]") as WishlistRow[];
        const next: WishlistRow[] = [
          { id: `local-${Date.now()}`, user_id: userId, product_id: wishlistProductId.trim(), created_at: new Date().toISOString(), products: null },
          ...current,
        ];
        window.localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(next));
        setWishlist(next);
        setMessage("Added to wishlist.");
      }
    } else if (error) setError(error.message);
    else setMessage("Added to wishlist.");
    setWishlistProductId("");
    await loadWishlist(userId);
    setSaving(false);
  }

  async function removeWishlistItem(id: string) {
    if (!supabase || !userId) return;
    const { error } = await supabase.from("wishlist").delete().eq("id", id).eq("user_id", userId);
    if (error && isMissingTableError(error.message)) {
      if (typeof window !== "undefined") {
        const current = JSON.parse(window.localStorage.getItem(LOCAL_WISHLIST_KEY) ?? "[]") as WishlistRow[];
        const next = current.filter((x) => x.id !== id);
        window.localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(next));
        setWishlist(next);
        return;
      }
    }
    await loadWishlist(userId);
  }

  async function saveNotifications() {
    if (!supabase || !userId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    const { error } = await supabase.from("notification_settings").upsert({ user_id: userId, ...notificationPrefs, updated_at: new Date().toISOString() });
    if (error && isMissingTableError(error.message)) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LOCAL_NOTIFICATION_KEY, JSON.stringify(notificationPrefs));
      }
      setMessage("Notification preferences saved.");
      setSaving(false);
      return;
    }
    if (error) setError(error.message);
    else setMessage("Notification preferences saved.");
    setSaving(false);
  }

  async function changePassword() {
    if (!supabase || !newPassword.trim()) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword.trim() });
    if (error) setError(error.message);
    else {
      setMessage("Password updated.");
      setNewPassword("");
    }
    setSaving(false);
  }

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-10">
        <div className="rounded-2xl border border-black/10 bg-white p-5 text-sm text-black/70">Loading settings...</div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-10 text-primary">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
        <aside className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="text-xs tracking-[0.24em] text-black/60">SETTINGS</div>
          <h1 className="mt-2 text-xl font-semibold">My Account</h1>
          <div className="mt-4 space-y-2">
            {tabs.map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={tab === k ? "w-full rounded-lg bg-accent px-3 py-2 text-left text-sm font-semibold text-primary" : "w-full rounded-lg border border-black/10 px-3 py-2 text-left text-sm"}
              >
                {label}
              </button>
            ))}
          </div>
        </aside>

        <section className="space-y-4">
          {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
          {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div> : null}

          {tab === "profile" ? (
            <div className="rounded-2xl border border-black/10 bg-white p-5">
              <h2 className="text-lg font-semibold">Profile</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <input value={profile.full_name ?? ""} onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))} placeholder="Full name" className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
                <input value={profile.username ?? ""} onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))} placeholder="Username" className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
                <input value={profile.email ?? ""} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className="rounded-lg border border-black/15 px-3 py-2 text-sm md:col-span-2" />
              </div>
              <div className="mt-4 flex items-center gap-3">
                {profile.avatar_url ? <img src={profile.avatar_url} alt="Avatar" className="h-16 w-16 rounded-full border border-black/10 object-cover" /> : <div className="h-16 w-16 rounded-full border border-black/10 bg-black/5" />}
                <input type="file" accept="image/*" className="text-sm" onChange={(e) => void uploadAvatar(e.target.files?.[0])} />
              </div>
              <button disabled={saving} onClick={() => void saveProfile()} className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-secondary disabled:opacity-60">
                Save profile
              </button>
            </div>
          ) : null}

          {tab === "addresses" ? (
            <div className="rounded-2xl border border-black/10 bg-white p-5">
              <h2 className="text-lg font-semibold">Address Management</h2>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                <input value={addressForm.full_name} onChange={(e) => setAddressForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="Full name" className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
                <input value={addressForm.phone_number} onChange={(e) => setAddressForm((f) => ({ ...f, phone_number: e.target.value }))} placeholder="Phone number" className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
                <input value={addressForm.address_line} onChange={(e) => setAddressForm((f) => ({ ...f, address_line: e.target.value }))} placeholder="Address line" className="rounded-lg border border-black/15 px-3 py-2 text-sm md:col-span-2" />
                <input value={addressForm.city} onChange={(e) => setAddressForm((f) => ({ ...f, city: e.target.value }))} placeholder="City" className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
                <input value={addressForm.state} onChange={(e) => setAddressForm((f) => ({ ...f, state: e.target.value }))} placeholder="State" className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
              </div>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={addressForm.is_default} onChange={(e) => setAddressForm((f) => ({ ...f, is_default: e.target.checked }))} />
                Set as default address
              </label>
              <button disabled={saving} onClick={() => void saveAddress()} className="mt-3 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-secondary disabled:opacity-60">
                {editingAddressId ? "Update address" : "Add address"}
              </button>
              <div className="mt-4 space-y-2">
                {addresses.map((a) => (
                  <div key={a.id} className="rounded-lg border border-black/10 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm">
                        <div className="font-semibold">{a.full_name} {a.is_default ? "(Default)" : ""}</div>
                        <div className="text-black/70">{a.address_line}, {a.city}, {a.state}</div>
                        <div className="text-black/60">{a.phone_number}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingAddressId(a.id);
                            setAddressForm({
                              full_name: a.full_name,
                              phone_number: a.phone_number,
                              address_line: a.address_line,
                              city: a.city,
                              state: a.state,
                              is_default: a.is_default,
                            });
                          }}
                          className="rounded-full border border-black/20 px-3 py-1 text-xs"
                        >
                          Edit
                        </button>
                        <button onClick={() => void setDefaultAddress(a.id)} className="rounded-full border border-black/20 px-3 py-1 text-xs">Default</button>
                        <button onClick={() => void deleteAddress(a.id)} className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-xs text-rose-700">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {tab === "orders" ? (
            <div className="rounded-2xl border border-black/10 bg-white p-5">
              <h2 className="text-lg font-semibold">Order History</h2>
              <div className="mt-3 space-y-2">
                {orders.map((o) => (
                  <div key={o.id} className="rounded-lg border border-black/10 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">Order #{o.id.slice(0, 8)}</div>
                      <div className="text-accent">{o.status}</div>
                    </div>
                    <div className="text-black/60">{new Date(o.created_at).toLocaleString()}</div>
                    <div className="mt-1 text-black/80">Total: ₦{Number(o.total ?? 0).toLocaleString()}</div>
                    {o.items?.length ? <div className="mt-1 text-black/70">{o.items.map((i) => `${i.product_name} x${i.quantity}`).join(", ")}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {tab === "wishlist" ? (
            <div className="rounded-2xl border border-black/10 bg-white p-5">
              <h2 className="text-lg font-semibold">Wishlist / Favorites</h2>
              <div className="mt-3 flex gap-2">
                <input value={wishlistProductId} onChange={(e) => setWishlistProductId(e.target.value)} placeholder="Product ID to add" className="flex-1 rounded-lg border border-black/15 px-3 py-2 text-sm" />
                <button onClick={() => void addWishlistItem()} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-secondary">Add</button>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                {wishlist.map((w) => (
                  <div key={w.id} className="rounded-lg border border-black/10 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm">{w.products?.name ?? `Product ${w.product_id}`}</div>
                        <div className="text-xs text-black/60">{w.products?.category ?? "Category"} · ₦{Number(w.products?.price ?? 0).toLocaleString()}</div>
                      </div>
                      <button onClick={() => void removeWishlistItem(w.id)} className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-xs text-rose-700">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {tab === "notifications" ? (
            <div className="rounded-2xl border border-black/10 bg-white p-5">
              <h2 className="text-lg font-semibold">Notification Settings</h2>
              <div className="mt-3 space-y-2">
                {[
                  ["order_updates", "Order updates"],
                  ["promotions", "Promotions"],
                  ["new_arrivals", "New arrivals"],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2 text-sm">
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(notificationPrefs[key as keyof NotificationPrefs])}
                      onChange={(e) =>
                        setNotificationPrefs((p) => ({
                          ...p,
                          [key]: e.target.checked,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
              <button onClick={() => void saveNotifications()} className="mt-3 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-secondary">Save preferences</button>
            </div>
          ) : null}

          {tab === "security" ? (
            <div className="rounded-2xl border border-black/10 bg-white p-5">
              <h2 className="text-lg font-semibold">Security</h2>
              <div className="mt-3 max-w-md space-y-2">
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm" />
                <button onClick={() => void changePassword()} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-secondary">Change password</button>
              </div>
              <button onClick={() => void logout()} className="mt-6 rounded-full border border-black/15 bg-white px-5 py-2 text-sm">
                Logout
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
