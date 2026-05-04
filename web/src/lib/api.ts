function normalizeBase(url: string) {
  return url.replace(/\/$/, "");
}

/**
 * When NEXT_PUBLIC_API_URL is unset: browser uses same-origin (`''`) so `/api/*` Route Handlers work.
 * SSR uses VERCEL_URL, NEXT_PUBLIC_SITE_URL, or `127.0.0.1:${PORT}` (default 3000).
 * Set NEXT_PUBLIC_API_URL only if your API is hosted separately from this Next app.
 */
export function getPublicApiBase(): string {
  const env = normalizeBase(process.env.NEXT_PUBLIC_API_URL?.trim() ?? "");
  if (env) return env;

  // Next.js Route Handlers live on this app (`/api/*`). Same-origin avoids SSR pointing at a missing Express port.
  if (typeof window !== "undefined") {
    return "";
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) return normalizeBase(site);

  const port = process.env.PORT?.trim() || "3000";
  return `http://127.0.0.1:${port}`;
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getPublicApiBase()}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getPublicApiBase()}${path}`, {
    method: "POST",
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return (await res.json()) as T;
}

export async function apiPatch<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getPublicApiBase()}${path}`, {
    method: "PATCH",
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return (await res.json()) as T;
}

export async function apiDelete<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getPublicApiBase()}${path}`, {
    method: "DELETE",
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return (await res.json()) as T;
}

export async function apiPut<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getPublicApiBase()}${path}`, {
    method: "PUT",
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return (await res.json()) as T;
}

