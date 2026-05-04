import jwt from "jsonwebtoken";
import { jwtSecret } from "@/lib/jwtSecret";

export function verifyAccessTokenSub(accessToken: string): string | null {
  const secret = jwtSecret();
  if (!secret) return null;
  try {
    const p = jwt.verify(accessToken, secret) as { sub?: string };
    return typeof p.sub === "string" ? p.sub : null;
  } catch {
    return null;
  }
}
