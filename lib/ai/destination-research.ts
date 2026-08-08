import type { DestinationInsightsResponse, DestinationResearchPlace, DestinationResearchSource, DestinationResearchReview } from "@/lib/decision/types";

const OPENAI_URL = "https://api.openai.com/v1/responses";

type UnknownRecord = Record<string, unknown>;
type ResearchJson = {
  overview?: string;
  things_to_do?: Array<{ name?: string; summary?: string; why_it_fits?: string; evidence_strength?: "HIGH" | "MEDIUM" | "LOW" }>;
  food_local_life?: Array<{ name?: string; summary?: string; why_it_fits?: string; evidence_strength?: "HIGH" | "MEDIUM" | "LOW"; kind?: "food" | "local_life" }>;
  review_pulse?: Array<{ title?: string; summary?: string; evidence_strength?: "HIGH" | "MEDIUM" | "LOW" }>;
  practical_notes?: string[];
};

const text = (value: unknown, max = 420) => typeof value === "string" ? value.trim().slice(0, max) : "";
const asRecord = (value: unknown): UnknownRecord | null => value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : null;

function outputText(payload: UnknownRecord): string {
  if (typeof payload.output_text === "string") return payload.output_text;
  const chunks: string[] = [];
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    const row = asRecord(item); if (!row || !Array.isArray(row.content)) continue;
    for (const part of row.content) {
      const content = asRecord(part); if (!content) continue;
      if (typeof content.text === "string") chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
}

function sourcesFromResponse(payload: UnknownRecord): DestinationResearchSource[] {
  const seen = new Set<string>();
  const sources: DestinationResearchSource[] = [];
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    const row = asRecord(item); if (!row || !Array.isArray(row.content)) continue;
    for (const part of row.content) {
      const content = asRecord(part); if (!content || !Array.isArray(content.annotations)) continue;
      for (const annotation of content.annotations) {
        const a = asRecord(annotation); if (!a) continue;
        const url = text(a.url, 1000); if (!url || seen.has(url) || !/^https?:\/\//i.test(url)) continue;
        seen.add(url);
        let domain = "web";
        try { domain = new URL(url).hostname.replace(/^www\./, ""); } catch { /* keep web */ }
        sources.push({ title: text(a.title, 180) || domain, url, domain, sourceType: domain.includes("tripadvisor.") ? "tripadvisor-reference" : "web" });
      }
    }
  }
  return sources.slice(0, 14);
}

function parseJson(raw: string): ResearchJson {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const first = cleaned.indexOf("{"); const last = cleaned.lastIndexOf("}");
  if (first < 0 || last <= first) throw new Error("Research agent did not return JSON");
  return JSON.parse(cleaned.slice(first, last + 1)) as ResearchJson;
}

function placeFrom(item: NonNullable<ResearchJson["things_to_do"]>[number], index: number): DestinationResearchPlace | null {
  const name = text(item.name, 140); const summary = text(item.summary, 320); if (!name || !summary) return null;
  return { id: `attraction-${index}-${name.toLowerCase().replace(/[^a-z0-9α-ωάέήίόύώϊϋ]+/gi, "-").slice(0, 40)}`, name, category: "ATTRACTION", summary, whyItFits: text(item.why_it_fits, 220) || null, evidenceStrength: item.evidence_strength ?? "MEDIUM", rating: null, reviewCount: null, imageUrl: null, address: null, distanceKm: null, attribution: "AI web research" };
}

function foodFrom(item: NonNullable<ResearchJson["food_local_life"]>[number], index: number): DestinationResearchPlace | null {
  const name = text(item.name, 140); const summary = text(item.summary, 320); if (!name || !summary) return null;
  return { id: `local-${index}-${name.toLowerCase().replace(/[^a-z0-9α-ωάέήίόύώϊϋ]+/gi, "-").slice(0, 40)}`, name, category: item.kind === "food" ? "RESTAURANT" : "OTHER", summary, whyItFits: text(item.why_it_fits, 220) || null, evidenceStrength: item.evidence_strength ?? "MEDIUM", rating: null, reviewCount: null, imageUrl: null, address: null, distanceKm: null, attribution: "AI web research" };
}

function reviewFrom(item: NonNullable<ResearchJson["review_pulse"]>[number], index: number): DestinationResearchReview | null {
  const summary = text(item.summary, 440); if (!summary) return null;
  return { id: `pulse-${index}`, title: text(item.title, 120) || "Research pulse", text: summary, rating: null, publishedDate: null, author: "AI research synthesis", evidenceStrength: item.evidence_strength ?? "MEDIUM" };
}

export async function researchDestination(input: {
  destination: string;
  latitude?: number | null;
  longitude?: number | null;
  language?: "el" | "en";
  travelerType?: string | null;
  moods?: string[];
  nights?: number | null;
}): Promise<DestinationInsightsResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { source: "not-configured", destination: input.destination, researchedAt: new Date().toISOString(), overview: null, restaurants: [], attractions: [], reviews: [], practicalNotes: [], sources: [], attributionRequired: false };

  const language = input.language === "en" ? "English" : "Greek";
  const model = process.env.OPENAI_RESEARCH_MODEL || "gpt-5.6-terra";
  const locationHint = input.latitude != null && input.longitude != null ? `Approximate coordinates: ${input.latitude}, ${input.longitude}.` : "";
  const userContext = `Traveler type: ${input.travelerType || "unknown"}. Intent: ${(input.moods || []).join(", ") || "general"}. Nights: ${input.nights ?? "unknown"}.`;

  const instructions = `You are the Destination Research Agent for a travel decision product. Research the chosen place live on the public web and return concise, useful travel intelligence in ${language}.\n\nSOURCE RULES:\n- Prefer primary and authoritative sources: official tourism boards, municipalities, museums, attractions, official restaurant sites, established local guides and reputable editorial travel publications.\n- You may discover Tripadvisor pages through web search and keep them as reference/source metadata, but DO NOT quote, copy, reproduce or summarize Tripadvisor review text, Tripadvisor ratings, review counts or proprietary ranking claims. Do not scrape or reconstruct protected Tripadvisor content.\n- Do not invent ratings, popularity, opening hours, prices, rankings or facts. If evidence is weak, say so through evidence_strength.\n- "Top" means your evidence-based recommendation for this specific traveler, not an official platform ranking unless a primary source explicitly says so.\n- No booking URLs, affiliate URLs or calls to purchase. The consumer's only outbound booking URL is handled elsewhere by the Linkwise layer.\n- Synthesize; do not copy sentences from sources. Keep every summary original and short.\n\nReturn JSON only with this shape: {"overview":"2-3 sentence orientation","things_to_do":[{"name":"...","summary":"...","why_it_fits":"...","evidence_strength":"HIGH|MEDIUM|LOW"}],"food_local_life":[{"name":"...","kind":"food|local_life","summary":"...","why_it_fits":"...","evidence_strength":"HIGH|MEDIUM|LOW"}],"review_pulse":[{"title":"...","summary":"cross-source synthesis, never copied review text","evidence_strength":"HIGH|MEDIUM|LOW"}],"practical_notes":["..."]}. Return up to 6 things_to_do, up to 6 food/local-life items, and up to 4 review_pulse themes.`;

  const prompt = `Research ${input.destination} as the traveler's already-selected destination. ${locationHint} ${userContext} Focus on what is genuinely worth doing, where/what to eat, how local life feels, and the practical trade-offs that help the traveler decide what to do there.`;

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, instructions, input: prompt, tools: [{ type: "web_search" }], reasoning: { effort: "medium" }, text: { verbosity: "medium" }, max_output_tokens: 3200, store: false }),
      signal: AbortSignal.timeout(26000)
    });
    if (!response.ok) throw new Error(`OpenAI research ${response.status}`);
    const payload = await response.json() as UnknownRecord;
    const data = parseJson(outputText(payload));
    const attractions = (data.things_to_do ?? []).map(placeFrom).filter((x): x is DestinationResearchPlace => Boolean(x)).slice(0, 6);
    const restaurants = (data.food_local_life ?? []).map(foodFrom).filter((x): x is DestinationResearchPlace => Boolean(x)).slice(0, 6);
    const reviews = (data.review_pulse ?? []).map(reviewFrom).filter((x): x is DestinationResearchReview => Boolean(x)).slice(0, 4);
    return {
      source: "openai-web-research",
      destination: input.destination,
      researchedAt: new Date().toISOString(),
      overview: text(data.overview, 720) || null,
      restaurants,
      attractions,
      reviews,
      practicalNotes: Array.isArray(data.practical_notes) ? data.practical_notes.map(x => text(x, 220)).filter(Boolean).slice(0, 6) : [],
      sources: sourcesFromResponse(payload),
      attributionRequired: false
    };
  } catch {
    return { source: "unavailable", destination: input.destination, researchedAt: new Date().toISOString(), overview: null, restaurants: [], attractions: [], reviews: [], practicalNotes: [], sources: [], attributionRequired: false };
  }
}
