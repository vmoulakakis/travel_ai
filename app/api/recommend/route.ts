import { NextResponse } from "next/server";
import { runTravelGuru } from "@/lib/ai/travel-guru";
import { loadAffiliateUniverse } from "@/lib/data/affiliate-universe";
import { enrichCandidatesWithWeather, weatherGate } from "@/lib/data/weather";
import { rankAffiliateCandidates } from "@/lib/decision/affiliate-engine";
import { parseTripRequest } from "@/lib/validation/trip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = parseTripRequest(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid trip request", details: parsed.errors }, { status: 400 });

  try {
    const universe = await loadAffiliateUniverse(parsed.data, 150);
    if (universe.length < 5) return NextResponse.json({ error: "Not enough tracked destinations overlap these exact dates" }, { status: 422 });
    const preRanked = rankAffiliateCandidates(parsed.data, universe, 40);
    const first = await enrichCandidatesWithWeather(parsed.data, preRanked.slice(0,24).map(x=>x.candidate), 24);
    let gated = weatherGate(parsed.data, first);
    if (gated.length < 7 && preRanked.length > 24) {
      const extra = await enrichCandidatesWithWeather(parsed.data, preRanked.slice(24,36).map(x=>x.candidate), 12);
      gated = weatherGate(parsed.data, [...first,...extra]);
    }
    if (gated.length < 5) return NextResponse.json({ error: "Not enough destinations passed weather/seasonality screening" }, { status: 422 });
    const ranked = rankAffiliateCandidates(parsed.data, gated, 18);
    const guru = await runTravelGuru(parsed.data, ranked);
    if (guru.recommendations.length !== 5) return NextResponse.json({ error: "Travel Guru could not produce five valid weather-screened choices" }, { status: 422 });

    return NextResponse.json({ request: parsed.data, generatedAt: new Date().toISOString(), mode: guru.mode, source: "linkwise-json-only", candidateCount: universe.length, weatherScreenedCount: gated.length, affiliateOnly: true, recommendations: guru.recommendations }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: "Travel decision pipeline unavailable", detail: error instanceof Error ? error.message : "unknown error" }, { status: 503 });
  }
}
