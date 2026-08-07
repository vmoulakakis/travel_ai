import { NextResponse } from "next/server";
import { loadTripadvisorInsights } from "@/lib/data/tripadvisor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  const lang = url.searchParams.get("lang") === "en" ? "en" : "el";
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) return NextResponse.json({ error: "valid lat/lon required" }, { status: 400 });
  const insights = await loadTripadvisorInsights(lat, lon, lang);
  return NextResponse.json(insights, { headers: { "cache-control": "private, max-age=0, s-maxage=300" } });
}
