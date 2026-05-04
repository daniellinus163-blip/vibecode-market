import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StatusEvent = { status: string; at: string; note?: string };

export async function GET(_req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await ctx.params;
  if (!orderId) return NextResponse.json({ error: "missing_order" }, { status: 400 });

  const service = createServiceSupabase();
  if (!service) {
    return NextResponse.json({
      status: "placed",
      statusEvents: [{ status: "placed", at: new Date().toISOString() }] as StatusEvent[],
    });
  }

  const { data, error } = await service
    .from("orders")
    .select("status,status_events,created_at")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !data) {
    const msg = String(error?.message ?? "").toLowerCase();
    if (msg.includes("could not find") || msg.includes("does not exist")) {
      return NextResponse.json({
        status: "placed",
        statusEvents: [{ status: "placed", at: new Date().toISOString() }],
      });
    }
    return NextResponse.json({ error: "track_failed", message: error?.message }, { status: 400 });
  }

  const row = data as { status?: string; status_events?: unknown; created_at?: string };
  let statusEvents = (Array.isArray(row.status_events) ? row.status_events : []) as StatusEvent[];
  if (statusEvents.length === 0 && row.created_at) {
    statusEvents = [{ status: String(row.status ?? "placed"), at: String(row.created_at) }];
  }

  return NextResponse.json({
    status: (row.status ?? "placed") as string,
    statusEvents,
  });
}
