import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const destinationId = url.searchParams.get("destination_id")?.trim();
  if (!destinationId) return NextResponse.json({ error: "destination_id is required" }, { status: 400 });

  const endpoint = process.env.SUPABASE_STAY_DATA_URL ?? "https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/travel-stay-data";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`${endpoint}?destination_id=${encodeURIComponent(destinationId)}&limit=6`, {
      signal: controller.signal,
      cache: "no-store",
      headers: { "user-agent": "travel-ai/3.0" }
    });
    if (!response.ok) return NextResponse.json({ mapped: false, places: [], error: "Stay intelligence unavailable" }, { status: 200 });
    const data = await response.json();
    return NextResponse.json(data, { headers: { "cache-control": "public, max-age=120, stale-while-revalidate=900" } });
  } catch {
    return NextResponse.json({ mapped: false, places: [], error: "Stay intelligence unavailable" }, { status: 200 });
  } finally {
    clearTimeout(timer);
  }
}
