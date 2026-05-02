"use client";

export function PageTransition({ children }: { children: React.ReactNode }) {
  // Keep routing reliable: render content directly to avoid transition lockups.
  return <>{children}</>;
}

