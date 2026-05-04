"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/** Demo tracks — royalty-free composer examples (not Shopify). Override via env for your own URLs. */
const DEFAULT_PLAYLIST = [
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
];

function parsePlaylistEnv(): string[] {
  const multi = (process.env.NEXT_PUBLIC_MUSIC_PLAYLIST_URLS ?? "").trim();
  const single = (process.env.NEXT_PUBLIC_BACKGROUND_MUSIC_URL ?? "").trim();
  const raw = multi || single;
  if (!raw) return [];
  return raw
    .split(/[,|\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Background playlist; URLs from NEXT_PUBLIC_MUSIC_PLAYLIST_URLS or bundled SoundHelix demos (non-Shopify). */
export function SiteMusic() {
  const urls = useMemo(() => {
    const fromEnv = parsePlaylistEnv();
    return fromEnv.length > 0 ? fromEnv : DEFAULT_PLAYLIST;
  }, []);

  const order = useMemo(() => {
    const shuf = process.env.NEXT_PUBLIC_MUSIC_SHUFFLE === "1";
    return shuf ? shuffle(urls) : urls;
  }, [urls]);

  const ref = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [index, setIndex] = useState(0);

  const advance = useCallback(() => {
    setIndex((i) => (order.length ? (i + 1) % order.length : 0));
  }, [order.length]);

  useEffect(() => {
    if (!ref.current || order.length === 0) return;
    const a = ref.current;
    a.volume = 0.28;
    a.src = order[index] ?? order[0] ?? "";
    if (muted) {
      void a.pause();
      return;
    }
    void a.play().catch(() => {});
  }, [index, muted, order]);

  const onEnded = useCallback(() => advance(), [advance]);

  if (order.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-[60] flex flex-col items-end gap-2 md:bottom-6">
      <audio ref={ref} onEnded={onEnded} preload="none" playsInline />
      <div className="rounded-full border border-black/10 bg-white/95 px-3 py-1 text-[10px] text-black/55 shadow backdrop-blur">
        Track {index + 1} / {order.length}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIndex((i) => (order.length ? (i - 1 + order.length) % order.length : 0))}
          className="rounded-full border border-black/15 bg-white/90 px-3 py-2 text-xs font-semibold text-black/70 shadow backdrop-blur hover:border-accent/50"
          aria-label="Previous track"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => advance()}
          className="rounded-full border border-black/15 bg-white/90 px-3 py-2 text-xs font-semibold text-black/70 shadow backdrop-blur hover:border-accent/50"
          aria-label="Next track"
        >
          ›
        </button>
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          className={cn(
            "rounded-full border px-4 py-2 text-xs font-semibold shadow backdrop-blur transition",
            muted
              ? "border-black/15 bg-white/90 text-black/70 hover:border-accent/50"
              : "border-accent/40 bg-accent/90 text-primary hover:bg-accent"
          )}
          aria-label={muted ? "Play background music" : "Mute background music"}
        >
          {muted ? "♪ Music" : "Mute"}
        </button>
      </div>
    </div>
  );
}
