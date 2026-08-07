import { NextResponse } from "next/server";
import { loadAffiliateDestinationDetail } from "@/lib/data/affiliate-universe";
import type { Month } from "@/lib/validation/trip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const validMonths = new Set<Month>(["september","october","november","flexible"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const destinationId = url.searchParams.get("destination_id")?.trim();
  const rawMonth = (url.searchParams.get("month") ?? "flexible") as Month;
  if (!destinationId) return NextResponse.json({ error: "destination_id required" }, { status: 400 });
  if (!validMonths.has(rawMonth)) return NextResponse.json({ error: "invalid month" }, { status: 400 });
  try {
    const detail = await loadAffiliateDestinationDetail(destinationId, rawMonth);
    return NextResponse.json(detail, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: "Destination offer detail unavailable", detail: error instanceof Error ? error.message : "unknown error" }, { status: 503 });
  }
}
