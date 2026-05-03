import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";

import { authRouter } from "./routes/auth.js";
import { productsRouter } from "./routes/products.js";
import { hasSupabaseEnv } from "./lib/supabase.js";
import { userRouter } from "./routes/user.js";
import { ordersRouter } from "./routes/orders.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(morgan("dev"));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/health", (_req, res) => res.json({ ok: true, supabaseConfigured: hasSupabaseEnv }));

  app.use("/api/auth", authRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/user", userRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/me", (_req, res) => res.status(503).json({ error: "migrating_to_supabase" }));
  app.use("/api/admin", (_req, res) => res.status(503).json({ error: "migrating_to_supabase" }));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[api]", err);
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      error: "internal_error",
      ...(process.env.NODE_ENV !== "production" ? { message: msg } : {}),
    });
  });

  return app;
}

