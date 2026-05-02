"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AdminUser = { id: string; email: string; created_at: string; is_admin?: boolean };
type AdminProduct = {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category: string;
  description: string;
  created_at: string;
};
type AdminVideo = { id: string; title: string; embed_url: string; created_at: string };

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"dashboard" | "users" | "products" | "videos">("dashboard");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [videos, setVideos] = useState<AdminVideo[]>([]);
  const [counts, setCounts] = useState({ users: 0, products: 0, videos: 0 });
  const [recentSignups, setRecentSignups] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    name: "",
    price: 0,
    image_url: "",
    category: "adults",
    description: "",
  });
  const [videoForm, setVideoForm] = useState({ title: "", embed_url: "" });

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      const [overview, usersRes, productsRes, videosRes] = await Promise.all([
        api<{ counts: { users: number; products: number; videos: number }; recentSignups: AdminUser[] }>("/api/admin/overview"),
        api<{ users: AdminUser[] }>("/api/admin/users"),
        api<{ products: AdminProduct[] }>("/api/admin/products"),
        api<{ videos: AdminVideo[] }>("/api/admin/videos"),
      ]);
      setCounts(overview.counts);
      setRecentSignups(overview.recentSignups ?? []);
      setUsers(usersRes.users ?? []);
      setProducts(productsRes.products ?? []);
      setVideos(videosRes.videos ?? []);
      setLoading(false);
    })().catch((e: any) => {
      setLoading(false);
      const msg = String(e?.message || "");
      if (msg.toLowerCase() === "unauthorized") {
        router.replace("/login?next=/admin");
        return;
      }
      if (msg.toLowerCase() === "forbidden") {
        setError("Admin access is required for this page.");
        return;
      }
      if (msg.toLowerCase().includes("admin setup missing env keys")) {
        setError(null);
        return;
      }
      setError(msg || "Could not load admin dashboard");
    });
  }, [router]);

  async function createProduct() {
    const res = await api<{ product: AdminProduct }>("/api/admin/products", "POST", productForm);
    setProducts((x) => [res.product, ...x]);
    setCounts((c) => ({ ...c, products: c.products + 1 }));
  }

  async function saveProduct(id: string, patch: Partial<AdminProduct>) {
    const res = await api<{ product: AdminProduct }>(`/api/admin/products/${id}`, "PATCH", patch);
    setProducts((x) => x.map((p) => (p.id === id ? res.product : p)));
  }

  async function removeProduct(id: string) {
    await api(`/api/admin/products/${id}`, "DELETE");
    setProducts((x) => x.filter((p) => p.id !== id));
    setCounts((c) => ({ ...c, products: Math.max(0, c.products - 1) }));
  }

  async function createVideo() {
    const res = await api<{ video: AdminVideo }>("/api/admin/videos", "POST", videoForm);
    setVideos((x) => [res.video, ...x]);
    setCounts((c) => ({ ...c, videos: c.videos + 1 }));
  }

  async function removeVideo(id: string) {
    await api(`/api/admin/videos/${id}`, "DELETE");
    setVideos((x) => x.filter((v) => v.id !== id));
    setCounts((c) => ({ ...c, videos: Math.max(0, c.videos - 1) }));
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-8 text-primary">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
        <aside className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="text-xs tracking-[0.24em] text-black/60">ADMIN</div>
          <h1 className="mt-2 text-xl font-semibold">Dashboard</h1>
          <div className="mt-4 space-y-2">
            {[
              ["dashboard", "Dashboard"],
              ["users", "Users"],
              ["products", "Products"],
              ["videos", "Videos"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key as any)}
                className={tab === key ? "w-full rounded-lg bg-accent px-3 py-2 text-left text-sm font-semibold text-primary" : "w-full rounded-lg border border-black/10 px-3 py-2 text-left text-sm"}
              >
                {label}
              </button>
            ))}
          </div>
        </aside>

        <section className="space-y-4">
          {loading ? <div className="rounded-2xl border border-black/10 bg-white p-5 text-sm text-black/70">Loading admin data...</div> : null}
          {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{error}</div> : null}

          {tab === "dashboard" ? (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-black/10 bg-white p-4"><div className="text-xs text-black/60">Total users</div><div className="mt-1 text-2xl font-semibold">{counts.users}</div></div>
                <div className="rounded-xl border border-black/10 bg-white p-4"><div className="text-xs text-black/60">Total products</div><div className="mt-1 text-2xl font-semibold">{counts.products}</div></div>
                <div className="rounded-xl border border-black/10 bg-white p-4"><div className="text-xs text-black/60">Total videos</div><div className="mt-1 text-2xl font-semibold">{counts.videos}</div></div>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-5">
                <h2 className="text-lg font-semibold">Recent signups</h2>
                <div className="mt-3 space-y-2">
                  {recentSignups.map((u) => (
                    <div key={u.id} className="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2 text-sm">
                      <span>{u.email}</span>
                      <span className="text-black/60">{new Date(u.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {tab === "users" ? (
            <div className="rounded-2xl border border-black/10 bg-white p-5">
              <h2 className="text-lg font-semibold">All Users ({users.length})</h2>
              <div className="mt-3 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-black/60">
                      <th className="py-2">Email</th>
                      <th className="py-2">Signup date</th>
                      <th className="py-2">Admin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-t border-black/10">
                        <td className="py-2">{u.email}</td>
                        <td className="py-2">{new Date(u.created_at).toLocaleString()}</td>
                        <td className="py-2">{u.is_admin ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {tab === "products" ? (
            <div className="rounded-2xl border border-black/10 bg-white p-5">
              <h2 className="text-lg font-semibold">Product Management</h2>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-5">
                <input value={productForm.name} onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))} placeholder="Name" className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
                <input type="number" value={productForm.price} onChange={(e) => setProductForm((f) => ({ ...f, price: Number(e.target.value || 0) }))} placeholder="Price" className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
                <input value={productForm.image_url} onChange={(e) => setProductForm((f) => ({ ...f, image_url: e.target.value }))} placeholder="Image URL" className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
                <input value={productForm.category} onChange={(e) => setProductForm((f) => ({ ...f, category: e.target.value }))} placeholder="Category" className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
                <button onClick={createProduct} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-secondary">Add product</button>
              </div>
              <textarea value={productForm.description} onChange={(e) => setProductForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description" className="mt-2 w-full rounded-lg border border-black/15 px-3 py-2 text-sm" />
              <div className="mt-4 space-y-2">
                {products.map((p) => (
                  <div key={p.id} className="rounded-lg border border-black/10 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-xs text-black/60">{p.category} · ₦{Number(p.price || 0).toLocaleString()}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveProduct(p.id, { name: `${p.name} Updated` })} className="rounded-full border border-black/20 px-3 py-1 text-xs">Edit</button>
                        <button onClick={() => removeProduct(p.id)} className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-xs text-rose-700">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {tab === "videos" ? (
            <div className="rounded-2xl border border-black/10 bg-white p-5">
              <h2 className="text-lg font-semibold">Fashion Videos</h2>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                <input value={videoForm.title} onChange={(e) => setVideoForm((f) => ({ ...f, title: e.target.value }))} placeholder="Video title" className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
                <input value={videoForm.embed_url} onChange={(e) => setVideoForm((f) => ({ ...f, embed_url: e.target.value }))} placeholder="YouTube embed URL" className="rounded-lg border border-black/15 px-3 py-2 text-sm md:col-span-2" />
              </div>
              <button onClick={createVideo} className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-secondary">Add video</button>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {videos.map((v) => (
                  <div key={v.id} className="overflow-hidden rounded-xl border border-black/10">
                    <iframe className="h-52 w-full" src={v.embed_url} title={v.title} allowFullScreen />
                    <div className="flex items-center justify-between px-3 py-2">
                      <div className="text-sm font-semibold">{v.title}</div>
                      <button onClick={() => removeVideo(v.id)} className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-xs text-rose-700">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { error?: string };
    const err = b.error || `Request failed: ${res.status}`;
    if (err.startsWith("admin_env_missing:")) {
      const vars = err.replace("admin_env_missing:", "");
      throw new Error(`Admin setup missing env keys: ${vars}. Add them in web/.env.local and restart dev server.`);
    }
    throw new Error(err);
  }
  return (await res.json()) as T;
}

