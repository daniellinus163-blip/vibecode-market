import { createHash, timingSafeEqual } from "crypto";

/** Constant-time comparison without leaking password length via timingSafeEqual length constraint. */
export function compareSecretDigest(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return ha.length === hb.length && timingSafeEqual(ha, hb);
}
