import { NextResponse } from "next/server";
import { recordGrowthEvent, type GrowthChannel, type GrowthEventName } from "@/lib/data/growth-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cookie = /(?:^|;\s*)travel_match_session=([0-9a-f-]{36})(?:;|$)/i;
const safe = /^[a-zA-Z0-9:_-]{1,160}$/;
const events = new Set<GrowthEventName>(["social_share", "stay_selected", "thematic_guide_download", "guide_download", "guide_email_sent", "final_exit"]);
const channels = new Set<GrowthChannel>(["native", "clipboard", "pdf", "email", "map", "tracking", "unknown"]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const eventName = body?.eventName as GrowthEventName;
  const destinationId = typeof body?.destinationId === "string" ? body.destinationId : "";
  const sourceProductId = typeof body?.sourceProductId === "string" ? body.sourceProductId : null;
  const channel = channels.has(body?.channel as GrowthChannel) ? body?.channel as GrowthChannel : "unknown";
  if (!events.has(eventName) || !safe.test(destinationId) || (sourceProductId && !safe.test(sourceProductId))) return NextResponse.json({ ok: false }, { status: 400 });
  const sessionId = request.headers.get("cookie")?.match(cookie)?.[1] ?? null;
  const ok = await recordGrowthEvent({ sessionId, eventName, destinationId, sourceProductId, channel });
  return NextResponse.json({ ok }, { status: ok ? 200 : 202, headers: { "cache-control": "no-store" } });
}
