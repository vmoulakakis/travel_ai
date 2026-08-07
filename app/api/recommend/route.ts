import { NextResponse } from "next/server";
import { enrichRecommendations } from "@/lib/ai/deepseek";
import { recommendTrips } from "@/lib/decision/engine";
import { parseTripRequest } from "@/lib/validation/trip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = parseTripRequest(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid trip request", details: parsed.errors }, { status: 400 });
  const deterministic = recommendTrips(parsed.data);
  const enriched = await enrichRecommendations(parsed.data, deterministic);
  const usedDeepSeek = Boolean(process.env.DEEPSEEK_API_KEY) && enriched.some((item, i) => item.reason !== deterministic[i]?.reason);
  return NextResponse.json({ request: parsed.data, generatedAt: new Date().toISOString(), mode: usedDeepSeek ? "deepseek-assisted" : "deterministic-fallback", recommendations: enriched });
}
