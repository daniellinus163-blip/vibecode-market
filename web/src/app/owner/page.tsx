"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type OwnerUser = { id: string; email: string; created_at?: string; is_admin?: boolean };

export default function OwnerCustomersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<OwnerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/owner/users", { credentials: "include", cache: "no-store" });
        if (res.status === 401) {
          router.replace("/login?next=/owner");
          return;
        }
        if (res.status === 403) {
          setError("This panel is restricted to the site owner account.");
          setLoading(false);
          return;
        }
        const body = (await res.json().catch(() => ({}))) as { users?: OwnerUser[]; error?: string };
        if (!res.ok) throw new Error(body.error || `Failed (${res.status})`);
        setUsers(body.users ?? []);
      } catch (e) {
        setError(String(e instanceof Error ? e.message : e));
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 text-primary">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs tracking-[0.24em] text-black/60">OWNER</div>
          <h1 className="mt-2 text-2xl font-semibold">Customers & sign-ins</h1>
          <p className="mt-1 max-w-xl text-sm text-black/65">
            Every profile merged with Supabase Auth — emails used for Google or password login appear here.
          </p>
        </div>
        <Link href="/admin" className="rounded-full border border-black/15 bg-white px-4 py-2 text-sm transition hover:border-accent/60">
          Open admin (products)
        </Link>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-black/70">Loading…</div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">{error}</div>
      ) : null}

      {!loading && !error ? (
        <div className="rounded-2xl border border-black/10 bg-white p-5">
          <h2 className="text-lg font-semibold">Accounts ({users.length})</h2>
          <div className="mt-4 overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-black/60">
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">First seen / signup</th>
                  <th className="py-2">Admin flag</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-black/10">
                    <td className="py-2 pr-4 font-medium">{u.email || "—"}</td>
                    <td className="py-2 pr-4 text-black/70">{u.created_at ? new Date(u.created_at).toLocaleString() : "—"}</td>
                    <td className="py-2">{u.is_admin ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </main>
  );
}
