import { NextResponse } from "next/server";
import { runTravelGuru } from "@/lib/ai/travel-guru";
import { loadAffiliateUniverse } from "@/lib/data/affiliate-universe";
import { rankAffiliateCandidates } from "@/lib/decision/affiliate-engine";
import { parseTripRequest } from "@/lib/validation/trip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = parseTripRequest(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid trip request", details: parsed.errors }, { status: 400 });

  try {
    const universe = await loadAffiliateUniverse(parsed.data, 140);
    if (universe.length < 5) return NextResponse.json({ error: "Not enough active affiliate destinations for this period" }, { status: 422 });
    const ranked = rankAffiliateCandidates(parsed.data, universe, 28);
    const guru = await runTravelGuru(parsed.data, ranked);
    if (guru.recommendations.length !== 5) return NextResponse.json({ error: "Travel Guru could not produce five valid feed-backed choices" }, { status: 422 });

    return NextResponse.json({
      request: parsed.data,
      generatedAt: new Date().toISOString(),
      mode: guru.mode,
      source: "linkwise-json-only",
      candidateCount: universe.length,
      affiliateOnly: true,
      recommendations: guru.recommendations
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: "Affiliate travel universe unavailable", detail: error instanceof Error ? error.message : "unknown error" }, { status: 503 });
  }
}
