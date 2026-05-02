import jwt from "jsonwebtoken";

export type JwtPayload = {
  sub: string;
  role: "user" | "admin";
  email?: string;
  name?: string;
};

const JWT_SECRET = process.env.JWT_SECRET ?? "";

export function signAccessToken(payload: JwtPayload) {
  if (!JWT_SECRET) throw new Error("Missing JWT_SECRET");
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): JwtPayload {
  if (!JWT_SECRET) throw new Error("Missing JWT_SECRET");
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

