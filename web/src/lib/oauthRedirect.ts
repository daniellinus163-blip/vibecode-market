/**
 * OAuth redirect URL must match a reachable Next origin.
 * Visiting http://localhost (no port) yields origin "http://localhost" → port 80 → connection refused on dev.
 */
export function getOAuthRedirectBase(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim().replace(/\/$/, "");
  if (explicit) return explicit;

  const { protocol, hostname, port } = window.location;
  const local = hostname === "localhost" || hostname === "127.0.0.1";
  if (local && !port) {
    return `${protocol}//${hostname}:3000`;
  }
  return window.location.origin;
}
