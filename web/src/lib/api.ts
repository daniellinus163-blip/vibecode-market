function normalizeBase(url: string) {
  return url.replace(/\/$/, "");
}

/**
 * Browser: empty string → same-origin fetch (when Express isn’t deployed).
 * Server (SSR): defaults to local Express on 127.0.0.1:4000 when env unset.
 * Set NEXT_PUBLIC_API_URL to your deployed API (https://…) for production API + sockets.
 */
export function getPublicApiBase(): string {
  const env = normalizeBase(process.env.NEXT_PUBLIC_API_URL?.trim() ?? "");
  if (env) return env;
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    // Cookies are host-scoped: localhost:* and 127.0.0.1:* do NOT share cookies — match API host to the page.
    if (host === "localhost") return "http://localhost:4000";
    if (host === "127.0.0.1") return "http://127.0.0.1:4000";
    return "";
  }
  // SSR / server: Vercel provides VERCEL_URL so fetches hit this deployment (Next API routes), not localhost.
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "http://127.0.0.1:4000";
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

