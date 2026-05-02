import type { RequestHandler } from "express";
import { verifyAccessToken } from "../lib/jwt.js";

declare global {
  // eslint-disable-next-line no-var
  var __auth: unknown;
}

export type AuthUser = { id: string; role: "user" | "admin" };

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

export const withOptionalAuth: RequestHandler = (req, _res, next) => {
  const token = req.cookies?.access_token;
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
  } catch {
    // ignore invalid token
  }
  next();
};

export const requireAuth: RequestHandler = (req, res, next) => {
  const token = req.cookies?.access_token;
  if (!token) return res.status(401).json({ error: "unauthorized" });
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ error: "unauthorized" });
  }
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  const token = req.cookies?.access_token;
  if (!token) return res.status(401).json({ error: "unauthorized" });
  try {
    const payload = verifyAccessToken(token);
    if (payload.role !== "admin") return res.status(403).json({ error: "forbidden" });
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ error: "unauthorized" });
  }
};

