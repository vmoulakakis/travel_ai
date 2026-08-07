import { runTravelGuru } from "@/lib/ai/travel-guru";
import { loadAffiliateUniverse } from "@/lib/data/affiliate-universe";
import { rankAffiliateCandidates } from "@/lib/decision/affiliate-engine";
import { parseTripRequest } from "@/lib/validation/trip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EventPayload = Record<string, unknown>;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = parseTripRequest(body);
  if (!parsed.success) return Response.json({ error: "Invalid trip request", details: parsed.errors }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (type: string, payload: EventPayload = {}) => controller.enqueue(encoder.encode(`${JSON.stringify({ type, at: new Date().toISOString(), ...payload })}\n`));
      try {
        emit("source:start", { source: "linkwise-json-only" });
        const universe = await loadAffiliateUniverse(parsed.data, 140);
        emit("source:ready", { candidateCount: universe.length, fiveStarRich: universe.filter(c => c.fiveStarOfferCount >= 5).length });
        if (universe.length < 5) { emit("error", { message: "Not enough active affiliate destinations for this period" }); controller.close(); return; }

        emit("rank:start", { filters: { distancePreference: parsed.data.distancePreference, pace: parsed.data.pace, hotelStyle: parsed.data.hotelStyle, avoid: parsed.data.avoid } });
        const ranked = rankAffiliateCandidates(parsed.data, universe, 28);
        emit("rank:ready", { shortlistCount: ranked.length, preview: ranked.slice(0, 8).map(x => ({ destination: x.candidate.locationLabel, score: Math.round(x.score), fiveStar: x.candidate.fiveStarOfferCount })) });

        emit("guru:start", { model: process.env.DEEPSEEK_API_KEY ? (process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro") : "deterministic-fallback" });
        const guru = await runTravelGuru(parsed.data, ranked);
        if (guru.recommendations.length !== 5) { emit("error", { message: "Travel Guru could not produce five valid feed-backed choices" }); controller.close(); return; }
        emit("guru:ready", { mode: guru.mode, distinctDestinations: guru.recommendations.length });
        emit("final", {
          result: {
            request: parsed.data,
            generatedAt: new Date().toISOString(),
            mode: guru.mode,
            source: "linkwise-json-only",
            candidateCount: universe.length,
            affiliateOnly: true,
            recommendations: guru.recommendations
          }
        });
      } catch (error) {
        emit("error", { message: error instanceof Error ? error.message : "Affiliate travel universe unavailable" });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store, no-transform", "x-content-type-options": "nosniff" } });
}
