import "dotenv/config";
import http from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { createApp } from "./serverApp.js";
import { hasSupabaseEnv } from "./lib/supabase.js";

const PORT = Number(process.env.PORT ?? 4000);
async function main() {
  if (!hasSupabaseEnv) {
    throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const app = createApp();
  const server = http.createServer(app);

  const io = new SocketIOServer(server, {
    cors: { origin: true, credentials: true },
  });

  io.on("connection", (socket) => {
    socket.on("orders:watch", ({ orderId }: { orderId: string }) => {
      socket.join(`order:${orderId}`);
    });
    socket.on("orders:unwatch", ({ orderId }: { orderId: string }) => {
      socket.leave(`order:${orderId}`);
    });
  });

  app.set("io", io);

  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

