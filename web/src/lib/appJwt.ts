import jwt from "jsonwebtoken";
import { jwtSecret } from "@/lib/jwtSecret";

export type AppJwtPayload = {
  sub: string;
  role: "user" | "admin";
  email?: string;
  name?: string;
};

export function signAppAccessToken(payload: AppJwtPayload): string {
  const secret = jwtSecret();
  if (!secret) throw new Error("Missing JWT_SECRET");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}
