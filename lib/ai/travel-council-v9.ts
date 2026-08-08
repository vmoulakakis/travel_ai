import { Output, ToolLoopAgent, isStepCount, tool } from "ai";
import { z } from "zod";
import { councilModels, type CouncilModelPreference } from "@/lib/ai/model-router-v9";
import { containsForbiddenTechnicalText } from "@/lib/continuity";
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

type DeepSeekMessage = { role: "system" | "user" | "assistant" | "tool"; content: string | null; tool_call_id?: string; tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }> };

async function runDeepSeekVoice(request: TripRequest, ranked: V8Ranked[], preference: CouncilModelPreference, abortSignal: AbortSignal) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;
  const endpoint = `${process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"}`.replace(/\/$/, "") + "/chat/completions";
  const model = process.env.DEEPSEEK_COUNCIL_MODEL || "deepseek-v4-flash";
  const packet = evidence(request, ranked);
  const role = preference === "creative" ? "Traveler Advocate" : "Skeptical Travel Editor";
  const mission = preference === "creative"
    ? "Choose the finalist that best matches the human purpose and rhythm of the trip."
    : "Challenge timing, effort, budget, season and evidence, then choose the strongest survivor.";
  const instructions = `You are the ${role}. ${mission} You must inspect the supplied evidence before deciding. Never invent travel facts. Use natural Greek when request language is Greek. Never mention technical systems, scores, models or providers. Your final response must be one JSON object like {"pickSlug":"nafplio","verdict":"...","confidence":"HIGH"}.`;
  const tools = [{ type: "function", function: { name: "inspectEvidence", description: "Read the verified traveler brief and finalist evidence.", parameters: { type: "object", properties: { focus: { type: "string", enum: ["desire", "risk", "tradeoffs"] } }, required: ["focus"], additionalProperties: false } } }];
  const requestBody = async (body: Record<string, unknown>) => {
    const response = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify({ model, thinking: { type: "disabled" }, ...body }), signal: abortSignal, cache: "no-store" });
    if (!response.ok) throw new Error("council unavailable");
    return await response.json() as { choices?: Array<{ message?: DeepSeekMessage }> };
  };
  const first = await requestBody({ messages: [{ role: "system", content: instructions }, { role: "user", content: "Call inspectEvidence before making any decision." }], tools, tool_choice: { type: "function", function: { name: "inspectEvidence" } }, max_tokens: 160 });
  const assistant = first.choices?.[0]?.message;
  const call = assistant?.tool_calls?.find(item => item.function.name === "inspectEvidence");
  if (!assistant || !call) throw new Error("evidence tool not called");
  const messages: DeepSeekMessage[] = [
    { role: "system", content: instructions },
    { role: "user", content: "Call inspectEvidence before making any decision." },
    { role: "assistant", content: assistant.content, tool_calls: assistant.tool_calls },
    { role: "tool", tool_call_id: call.id, content: JSON.stringify(packet) },
    { role: "user", content: "Return only the final JSON object now." },
  ];
  const second = await requestBody({ messages, response_format: { type: "json_object" }, max_tokens: 260 });
  const content = second.choices?.[0]?.message?.content;
  if (!content) throw new Error("empty verdict");
  const parsed = outputSchema.safeParse(JSON.parse(content));
  if (!parsed.success || !ranked.some(x => x.destination.slug === parsed.data.pickSlug) || containsForbiddenTechnicalText(parsed.data.verdict)) return null;
  return parsed.data;
}

async function runVoice(request: TripRequest, ranked: V8Ranked[], preference: CouncilModelPreference) {
  const packet = evidence(request, ranked);
  const startedAt = Date.now();
  const totalBudgetMs = 9_000;
  if (process.env.DEEPSEEK_API_KEY) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), totalBudgetMs);
    try {
      const verdict = await runDeepSeekVoice(request, ranked, preference, controller.signal);
      if (verdict) return verdict;
    } catch {
      // Continue to another configured council only when the private agent could not finish.
    } finally {
      clearTimeout(timer);
    }
  }
  for (const model of councilModels(preference, false)) {
    const remainingMs = totalBudgetMs - (Date.now() - startedAt);
    if (remainingMs < 900) break;
    const inspectEvidence = tool({
      description: "Read the verified traveler brief and finalist evidence before giving a verdict.",
      inputSchema: z.object({ focus: z.enum(["desire", "risk", "tradeoffs"]) }),
      execute: async () => packet,
    });
    const instructions = preference === "creative"
      ? "You are the Traveler Advocate. Call inspectEvidence first. Find the one finalist that best matches the human purpose of the trip without inventing facts. Use natural Greek when the request language is Greek. Never mention models, providers, APIs, scores or internal systems."
      : "You are the Skeptical Travel Editor. Call inspectEvidence first. Try to reject weak choices on timing, effort, budget, season or evidence. Then select the safest strong finalist. Use natural Greek when the request language is Greek. Never invent facts or mention technical systems.";
    try {
      const agent = new ToolLoopAgent({ model, instructions, tools: { inspectEvidence }, output: Output.object({ schema: outputSchema, name: "travel_verdict", description: "The independent travel verdict as a JSON object." }), stopWhen: isStepCount(3) });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), remainingMs);
      try {
        const result = await agent.generate({ prompt: "Review the evidence, call the tool, then return only one JSON object with pickSlug, verdict, and confidence.", abortSignal: controller.signal });
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
