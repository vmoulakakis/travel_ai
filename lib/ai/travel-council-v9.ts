import { Output, ToolLoopAgent, isStepCount, tool } from "ai";
import { z } from "zod";
import { councilModels, type CouncilModelPreference } from "@/lib/ai/model-router-v9";
import type { V8Ranked } from "@/lib/decision/v8-matcher";
import type { TripRequest } from "@/lib/validation/trip";

export interface CouncilVoice {
  role: "traveler-advocate" | "skeptical-editor";
  titleEl: string;
  titleEn: string;
  verdict: string;
  pickSlug: string;
  confidence: "HIGH" | "MEDIUM";
  source: "agent" | "verified-fallback";
}

export interface TravelCouncilDecision {
  voices: CouncilVoice[];
  finalSlug: string;
  agreement: "STRONG" | "BALANCED";
}

const outputSchema = z.object({
  pickSlug: z.string().min(1).max(80),
  verdict: z.string().min(12).max(240),
  confidence: z.enum(["HIGH", "MEDIUM"]),
});

function evidence(request: TripRequest, ranked: V8Ranked[]) {
  return {
    request: {
      origin: request.origin,
      dates: [request.startDate, request.endDate],
      nights: request.nights,
      budget: request.budget,
      moods: request.moods,
      travelerType: request.travelerType,
      pace: request.pace,
      avoid: request.avoid,
      freeText: request.tripText || null,
    },
    candidates: ranked.slice(0, 6).map((x, index) => ({
      rank: index + 1,
      slug: x.destination.slug,
      name: request.language === "en" ? x.destination.nameEn : x.destination.nameEl,
      tags: x.destination.tags,
      score: Math.round(x.score),
      evidence: x.breakdown,
      weather: x.weather ? { summary: x.weather.summary, confidence: x.weather.confidence } : null,
      costTier: x.destination.costTier,
      routeConfidence: x.destination.routeConfidence,
    })),
  };
}

async function runVoice(request: TripRequest, ranked: V8Ranked[], preference: CouncilModelPreference) {
  const packet = evidence(request, ranked);
  for (const model of councilModels(preference)) {
    const inspectEvidence = tool({
      description: "Read the verified traveler brief and finalist evidence before giving a verdict.",
      inputSchema: z.object({ focus: z.enum(["desire", "risk", "tradeoffs"]) }),
      execute: async () => packet,
    });
    const instructions = preference === "creative"
      ? "You are the Traveler Advocate. Call inspectEvidence first. Find the one finalist that best matches the human purpose of the trip without inventing facts. Use natural Greek when the request language is Greek. Never mention models, providers, APIs, scores or internal systems."
      : "You are the Skeptical Travel Editor. Call inspectEvidence first. Try to reject weak choices on timing, effort, budget, season or evidence. Then select the safest strong finalist. Use natural Greek when the request language is Greek. Never invent facts or mention technical systems.";
    try {
      const agent = new ToolLoopAgent({ model, instructions, tools: { inspectEvidence }, output: Output.object({ schema: outputSchema }), stopWhen: isStepCount(3) });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6_500);
      try {
        const result = await agent.generate({ prompt: "Review the evidence, call the tool, and return your independent verdict.", abortSignal: controller.signal });
        if (result.output && ranked.some(x => x.destination.slug === result.output.pickSlug)) return result.output;
      } finally {
        clearTimeout(timer);
      }
    } catch {
      // Continue through the private fallback ladder. Technical failures never cross the response boundary.
    }
  }
  return null;
}

function fallback(request: TripRequest, ranked: V8Ranked[], critical: boolean): CouncilVoice {
  const pick = critical
    ? [...ranked].sort((a, b) => (b.breakdown.season + b.breakdown.effort + b.breakdown.routeConfidence) - (a.breakdown.season + a.breakdown.effort + a.breakdown.routeConfidence))[0]
    : ranked[0];
  const el = request.language !== "en";
  return {
    role: critical ? "skeptical-editor" : "traveler-advocate",
    titleEl: critical ? "Ο δύσκολος ελεγκτής" : "Ο συνήγορος του ταξιδιώτη",
    titleEn: critical ? "The skeptical editor" : "The traveler advocate",
    pickSlug: pick.destination.slug,
    verdict: critical
      ? (el ? `${pick.destination.nameEl}: αντέχει καλύτερα στον έλεγχο εποχής, μετακίνησης και αξιοπιστίας.` : `${pick.destination.nameEn}: the strongest survivor of the timing, effort and evidence check.`)
      : (el ? `${pick.destination.nameEl}: εκφράζει καθαρότερα τον σκοπό και τον ρυθμό αυτού του ταξιδιού.` : `${pick.destination.nameEn}: best expresses the purpose and rhythm of this trip.`),
    confidence: "MEDIUM",
    source: "verified-fallback",
  };
}

export async function runTravelCouncilV9(request: TripRequest, ranked: V8Ranked[]): Promise<TravelCouncilDecision> {
  const [creative, critical] = await Promise.all([runVoice(request, ranked, "creative"), runVoice(request, ranked, "critical")]);
  const advocate = creative ? {
    role: "traveler-advocate" as const, titleEl: "Ο συνήγορος του ταξιδιώτη", titleEn: "The traveler advocate", ...creative, source: "agent" as const,
  } : fallback(request, ranked, false);
  const skeptic = critical ? {
    role: "skeptical-editor" as const, titleEl: "Ο δύσκολος ελεγκτής", titleEn: "The skeptical editor", ...critical, source: "agent" as const,
  } : fallback(request, ranked, true);
  const agreement = advocate.pickSlug === skeptic.pickSlug ? "STRONG" : "BALANCED";
  return { voices: [advocate, skeptic], finalSlug: advocate.pickSlug, agreement };
}
