"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type ProductView = {
  id: string;
  title: string;
  slug: string;
  category: string;
  priceCents: number;
  image: string;
};

type ChatMsg = {
  role: "user" | "assistant";
  text: string;
  products?: ProductView[];
  imageDataUrl?: string;
};

function naira(cents: number) {
  return `₦${(cents / 100).toLocaleString()}`;
}

export function FashionStylistChat() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [statusMode, setStatusMode] = useState<"ai_online" | "fallback_mode">("fallback_mode");
  const listRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      text: "Hi, I am your AI stylist assistant. Ask me fashion or general questions just like ChatGPT.",
    },
  ]);
  const quickPrompts = [
    "I need a black party outfit under 20k",
    "What should I wear for a date?",
    "Who is the president of Nigeria?",
  ];

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, open, busy]);

  useEffect(() => {
    fetch("/api/stylist-chat", { method: "GET", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((r) => {
        if (r?.mode === "ai_online" || r?.mode === "fallback_mode") {
          setStatusMode(r.mode);
        }
      })
      .catch(() => {});
  }, []);

  async function send() {
    const q = input.trim();
    if ((!q && !imageDataUrl) || busy) return;
    setError(null);
    setInput("");
    setBusy(true);
    const nextMessages = [...messages, { role: "user" as const, text: q || "Please analyze this image.", imageDataUrl }];
    setMessages(nextMessages);
    setImageDataUrl("");
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch("/api/stylist-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: q || "Please analyze this image.",
          imageDataUrl: imageDataUrl || undefined,
          history: nextMessages.slice(-10).map((m) => ({ role: m.role, content: m.text })),
        }),
      });
      clearTimeout(timeout);
      const body = (await res.json().catch(() => ({}))) as { reply?: string; products?: ProductView[]; error?: string };
      if (!res.ok) throw new Error(body.error || "stylist_error");
      setMessages((m) => [...m, { role: "assistant", text: body.reply || "I found some pieces for you.", products: body.products ?? [] }]);
    } catch {
      setError("Message timed out or failed. Retrying usually works.");
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "I had a temporary connection issue. Please ask again, I am ready.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((x) => !x)}
        className="fixed bottom-5 right-4 z-40 rounded-full border border-black/15 bg-accent px-4 py-3 text-sm font-semibold text-primary shadow-luxe transition hover:opacity-90"
      >
        {open ? "Close Stylist" : "AI Stylist"}
      </button>

      {open ? (
        <div className="fixed bottom-20 right-3 z-40 h-[74vh] w-[calc(100vw-24px)] max-w-md rounded-2xl border border-black/10 bg-white shadow-luxe">
          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-primary">AI Fashion Stylist</div>
              <span
                className={
                  statusMode === "ai_online"
                    ? "rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
                    : "rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
                }
              >
                {statusMode === "ai_online" ? "AI Online" : "Fallback Mode"}
              </span>
            </div>
            <button
              onClick={() =>
                setMessages([
                  {
                    role: "assistant",
                    text: "Hi, I am your AI stylist assistant. Ask me fashion or general questions just like ChatGPT.",
                  },
                ])
              }
              className="text-xs text-black/60 hover:text-black"
            >
              New chat
            </button>
          </div>
          <div className="border-b border-black/10 px-3 py-2">
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => setInput(p)}
                  className="rounded-full border border-black/15 bg-white px-3 py-1 text-xs text-black/75 hover:border-accent/50"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div ref={listRef} className="h-[calc(74vh-176px)] space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((m, i) => (
              <div key={`${m.role}-${i}`} className={m.role === "user" ? "text-right" : ""}>
                <div
                  className={
                    m.role === "user"
                      ? "ml-8 inline-block rounded-2xl bg-primary px-3 py-2 text-sm text-secondary"
                      : "mr-8 inline-block rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black/85"
                  }
                >
                  {m.text}
                </div>
                {m.imageDataUrl ? (
                  <img
                    src={m.imageDataUrl}
                    alt="Uploaded"
                    className={`mt-2 h-20 w-20 rounded-lg border border-black/10 object-cover ${m.role === "user" ? "ml-auto" : ""}`}
                  />
                ) : null}
                {m.products?.length ? (
                  <div className="mt-2 space-y-2">
                    {m.products.slice(0, 3).map((p) => (
                      <Link
                        key={p.id}
                        href={`/product/${p.slug}`}
                        className="flex items-center justify-between rounded-xl border border-black/10 bg-white px-3 py-2 text-left text-xs text-black/80 transition hover:border-accent/60"
                      >
                        <span className="truncate pr-2">{p.title}</span>
                        <span className="whitespace-nowrap font-semibold text-primary">{naira(p.priceCents || 0)}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {busy ? <div className="text-xs text-black/55">Typing...</div> : null}
          </div>

          <div className="border-t border-black/10 p-3">
            {error ? <div className="mb-2 text-xs text-rose-600">{error}</div> : null}
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void send();
                }}
                placeholder="I need a black party outfit under 20k"
                className="flex-1 rounded-full border border-black/15 px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-black/15 px-3 py-2 text-xs text-black/75 hover:border-accent/50">
                Image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const v = typeof reader.result === "string" ? reader.result : "";
                      setImageDataUrl(v);
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              <button
                disabled={busy}
                onClick={send}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-secondary disabled:opacity-60"
              >
                Send
              </button>
            </div>
            {imageDataUrl ? (
              <div className="mt-2 flex items-center justify-between rounded-lg border border-black/10 px-2 py-1 text-xs text-black/70">
                <span>Image attached</span>
                <button onClick={() => setImageDataUrl("")} className="text-accent hover:underline">
                  Remove
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
