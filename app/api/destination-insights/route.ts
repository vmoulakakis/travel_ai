import { NextResponse } from "next/server";
import { researchDestination } from "@/lib/ai/destination-research";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const destination = (url.searchParams.get("destination") ?? "").trim();
  const latRaw = url.searchParams.get("lat");
  const lonRaw = url.searchParams.get("lon");
  const latitude = latRaw == null ? null : Number(latRaw);
  const longitude = lonRaw == null ? null : Number(lonRaw);
  const lang = url.searchParams.get("lang") === "en" ? "en" : "el";
  const travelerType = url.searchParams.get("traveler");
  const moods = (url.searchParams.get("moods") ?? "").split(",").map(x => x.trim()).filter(Boolean).slice(0, 3);
  const nightsRaw = Number(url.searchParams.get("nights"));
  const nights = Number.isFinite(nightsRaw) ? Math.max(1, Math.min(21, Math.round(nightsRaw))) : null;

  const invalidMessage = lang === "en" ? "I need a valid destination to continue." : "Χρειάζομαι έναν έγκυρο προορισμό για να συνεχίσω.";
  if (destination.length < 2 || destination.length > 140) return NextResponse.json({ message: invalidMessage }, { status: 400 });
  if (latitude != null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) return NextResponse.json({ message: invalidMessage }, { status: 400 });
  if (longitude != null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) return NextResponse.json({ message: invalidMessage }, { status: 400 });

  const insights = await researchDestination({ destination, latitude, longitude, language: lang, travelerType, moods, nights });
  const cache = insights.source === "verified-synthesis" ? "public, s-maxage=1800, stale-while-revalidate=21600" : "private, max-age=0";
  return NextResponse.json(insights, { headers: { "cache-control": cache } });
}
