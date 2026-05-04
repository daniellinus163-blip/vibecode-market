"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const MUSIC_URL = (process.env.NEXT_PUBLIC_BACKGROUND_MUSIC_URL ?? "").trim();

/** Optional ambient loop; set NEXT_PUBLIC_BACKGROUND_MUSIC_URL to a direct MP3/OGG URL you have rights to use. */
export function SiteMusic() {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (!MUSIC_URL || !ref.current) return;
    const a = ref.current;
    a.volume = 0.35;
    if (muted) {
      void a.pause();
      return;
    }
    void a.play().catch(() => {});
  }, [muted]);

  if (!MUSIC_URL) return null;

  return (
    <div className="fixed bottom-20 right-4 z-[60] md:bottom-6">
      <audio ref={ref} src={MUSIC_URL} loop preload="none" playsInline />
      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        className={cn(
          "rounded-full border px-4 py-2 text-xs font-semibold shadow-lg backdrop-blur transition",
          muted
            ? "border-black/15 bg-white/90 text-black/70 hover:border-accent/50"
            : "border-accent/40 bg-accent/90 text-primary hover:bg-accent"
        )}
        aria-label={muted ? "Play background music" : "Mute background music"}
      >
        {muted ? "♪ Music" : "Mute"}
      </button>
    </div>
  );
}
