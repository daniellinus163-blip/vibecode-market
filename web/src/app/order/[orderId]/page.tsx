"use client";

import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import { AnimatePresence, motion } from "framer-motion";
import * as Progress from "@radix-ui/react-progress";
import { apiGet, API_URL } from "@/lib/api";

type OrderStatus =
  | "placed"
  | "paid"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

type StatusEvent = { status: OrderStatus; at: string; note?: string };

const steps: { key: OrderStatus; label: string }[] = [
  { key: "placed", label: "Placed" },
  { key: "paid", label: "Paid" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "out_for_delivery", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
];

function stepIndex(status: OrderStatus) {
  const idx = steps.findIndex((s) => s.key === status);
  return idx < 0 ? 0 : idx;
}

export default function OrderTrackingPage({ params }: { params: { orderId: string } }) {
  const orderId = params.orderId;
  const [status, setStatus] = useState<OrderStatus>("placed");
  const [events, setEvents] = useState<StatusEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const progress = useMemo(() => {
    if (status === "cancelled") return 100;
    const idx = stepIndex(status);
    return Math.round(((idx + 1) / steps.length) * 100);
  }, [status]);

  useEffect(() => {
    apiGet("/api/user/profile").catch(() => {
      // Do not auto-redirect unexpectedly while user is browsing.
    });
  }, [orderId]);

  useEffect(() => {
    let mounted = true;
    apiGet<{ status: OrderStatus; statusEvents: StatusEvent[] }>(`/api/orders/${orderId}/track`)
      .then((r) => {
        if (!mounted) return;
        setStatus(r.status);
        setEvents(r.statusEvents ?? []);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [orderId]);

  useEffect(() => {
    const s: Socket = io(API_URL, { withCredentials: true, transports: ["websocket"] });
    s.emit("orders:watch", { orderId });
    s.on("order:status", (payload: any) => {
      if (payload?.orderId !== orderId) return;
      setStatus(payload.status);
      setEvents(payload.statusEvents ?? []);
    });
    return () => {
      s.emit("orders:unwatch", { orderId });
      s.disconnect();
    };
  }, [orderId]);

  return (
    <main className="mx-auto max-w-5xl px-5 pb-24 pt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs tracking-[0.3em] text-white/60">ORDER TRACKING</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Status timeline</h1>
        </div>
        <div className="text-xs text-white/60">
          ID <span className="text-white/80">{orderId.slice(0, 8)}…</span>
        </div>
      </div>

      <div className="mt-6 rounded-[26px] border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-center justify-between">
          <div className="text-xs tracking-[0.28em] text-white/60">CURRENT</div>
          <div className="text-sm font-semibold text-accent">
            {status === "out_for_delivery" ? "Out for delivery" : status.toUpperCase()}
          </div>
        </div>

        <div className="mt-4">
          <Progress.Root className="relative h-2 overflow-hidden rounded-full bg-white/10" value={progress}>
            <Progress.Indicator
              className="h-full w-full rounded-full bg-accent transition-transform duration-700"
              style={{ transform: `translateX(-${100 - progress}%)` }}
            />
          </Progress.Root>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-6">
          {steps.map((s, idx) => {
            const active = status !== "cancelled" && idx <= stepIndex(status);
            return (
              <div key={s.key} className="rounded-[18px] border border-white/10 bg-white/5 p-4">
                <div className="text-xs tracking-[0.22em] text-white/60">STEP {idx + 1}</div>
                <div className={active ? "mt-2 text-sm font-semibold text-white" : "mt-2 text-sm text-white/50"}>
                  {s.label}
                </div>
                <div className={active ? "mt-2 h-1 rounded-full bg-accent" : "mt-2 h-1 rounded-full bg-white/10"} />
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <div className="text-xs tracking-[0.28em] text-white/60">EVENTS</div>
          <div className="mt-3 space-y-2">
            <AnimatePresence initial={false}>
              {loading ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-white/60">
                  Loading…
                </motion.div>
              ) : null}
            </AnimatePresence>
            {events
              .slice()
              .reverse()
              .map((e, i) => (
                <motion.div
                  key={`${e.status}:${e.at}:${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-semibold">
                      <span className="mr-2 text-accent">■</span>
                      {e.status === "out_for_delivery" ? "Out for delivery" : e.status.toUpperCase()}
                    </div>
                    <div className="text-xs text-white/60">{new Date(e.at).toLocaleString()}</div>
                  </div>
                  {e.note ? <div className="mt-1 text-sm text-white/70">{e.note}</div> : null}
                </motion.div>
              ))}
          </div>
        </div>
      </div>
    </main>
  );
}

