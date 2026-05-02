/** Convert absolute localhost URLs saved in DB/cookies into same-origin paths for production. */
export function sameSiteImageSrc(src: string): string {
  if (!src) return src;
  try {
    const u = new URL(src);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
      return `${u.pathname}${u.search}`;
    }
  } catch {
    /* relative URL */
  }
  return src;
}
