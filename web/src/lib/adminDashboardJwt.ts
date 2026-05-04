import jwt from "jsonwebtoken";
import { jwtSecret } from "@/lib/jwtSecret";

export type AdminDashboardJwtPayload = {
  sub: string;
  email: string;
  ad?: boolean;
};

export function signAdminDashboardToken(email: string): string {
  const secret = jwtSecret();
  if (!secret) throw new Error("Missing JWT_SECRET");
  const normalized = email.toLowerCase().trim();
  return jwt.sign({ sub: normalized, email: normalized, ad: true }, secret, { expiresIn: "7d" });
}

export function verifyAdminDashboardToken(token: string): AdminDashboardJwtPayload | null {
  const secret = jwtSecret();
  if (!secret) return null;
  try {
    const p = jwt.verify(token, secret) as AdminDashboardJwtPayload;
    if (!p?.ad || !p.email) return null;
    return { sub: String(p.sub), email: String(p.email).toLowerCase().trim(), ad: true };
  } catch {
    return null;
  }
}
