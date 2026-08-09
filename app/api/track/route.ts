import { NextResponse } from "next/server";
import { recordV8OfferEvent } from "@/lib/data/match-learning-v8";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cookie = /(?:^|;\s*)travel_match_session=([0-9a-f-]{36})(?:;|$)/i;
const safeId = /^[a-zA-Z0-9:_-]{1,160}$/;

export async function POST(request: Request) {
  const sessionId = request.headers.get("cookie")?.match(cookie)?.[1] ?? null;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const eventName = body?.eventName;
  const destinationId = typeof body?.destinationId === "string" ? body.destinationId : "";
  const sourceProductId = typeof body?.sourceProductId === "string" ? body.sourceProductId : "";
  if (!sessionId || eventName !== "outbound_click" || !safeId.test(destinationId) || !safeId.test(sourceProductId)) return NextResponse.json({ ok: false }, { status: 400 });
  const ok = await recordV8OfferEvent(sessionId, "outbound_click", destinationId, sourceProductId);
  return NextResponse.json({ ok }, { status: ok ? 200 : 202, headers: { "cache-control": "no-store" } });
}
