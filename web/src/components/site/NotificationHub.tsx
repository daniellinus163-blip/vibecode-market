"use client";

import { useEffect, useState } from "react";

export function NotificationHub() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string }>).detail;
      if (!detail?.message) return;
      setMessage(detail.message);
      window.setTimeout(() => setMessage(null), 1800);
    };
    window.addEventListener("app:notify", handler);
    return () => window.removeEventListener("app:notify", handler);
  }, []);

  if (!message) return null;
  return (
    <div className="fixed right-4 top-20 z-[70] rounded-lg border border-black/10 bg-white px-4 py-2 text-sm text-black shadow-md">
      {message}
    </div>
  );
}

