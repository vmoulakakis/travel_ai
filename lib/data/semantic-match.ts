import type { SemanticMatchData, DestinationSemanticProfile, StaySemanticProfile, SemanticModelState } from "@/lib/decision/types";

const BASE = process.env.SUPABASE_SEMANTIC_MATCH_URL ?? "https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/semantic-match-data";

function parseVector(value: unknown): number[] {
  if (Array.isArray(value)) return value.map(Number).filter(Number.isFinite).slice(0, 24);
  if (typeof value !== "string") return [];
  const clean = value.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!clean) return [];
  return clean.split(",").map(Number).filter(Number.isFinite).slice(0, 24);
}

function normalizeDestination(row: unknown): DestinationSemanticProfile | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const id = typeof r.destination_id === "string" ? r.destination_id : "";
  const label = typeof r.location_label === "string" ? r.location_label : "";
  const vector = parseVector(r.vector);
  if (!id || !label || vector.length !== 24) return null;
  return {
    destination_id: id,
    location_label: label,
    vector,
    archetypes: Array.isArray(r.archetypes) ? r.archetypes.filter((x): x is string => typeof x === "string").slice(0, 8) : [],
    confidence: Number.isFinite(Number(r.confidence)) ? Number(r.confidence) : 0.5,
    evidence: r.evidence && typeof r.evidence === "object" ? r.evidence as Record<string, unknown> : {},
    learning: r.learning && typeof r.learning === "object" ? r.learning as DestinationSemanticProfile["learning"] : {},
    media: Array.isArray(r.media) ? r.media.filter((x): x is NonNullable<DestinationSemanticProfile["media"]>[number] => Boolean(x && typeof x === "object" && typeof (x as Record<string, unknown>).url === "string")) : []
  };
}

function normalizeStay(row: unknown): StaySemanticProfile | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const id = typeof r.source_product_id === "string" ? r.source_product_id : "";
  const name = typeof r.property_name === "string" ? r.property_name : "";
  const vector = parseVector(r.vector);
  if (!id || !name || vector.length !== 24) return null;
  return {
    source_product_id: id,
    destination_id: typeof r.destination_id === "string" ? r.destination_id : null,
    property_name: name,
    vector,
    confidence: Number.isFinite(Number(r.confidence)) ? Number(r.confidence) : 0.5,
    evidence: r.evidence && typeof r.evidence === "object" ? r.evidence as Record<string, unknown> : {}
  };
}

function normalizeModel(row: unknown): SemanticModelState {
  const r = row && typeof row === "object" ? row as Record<string, unknown> : {};
  return {
    version: typeof r.version === "string" ? r.version : "semantic-neural-v1",
    architecture: r.architecture && typeof r.architecture === "object" ? r.architecture as Record<string, unknown> : {},
    weights: r.weights && typeof r.weights === "object" ? r.weights as Record<string, unknown> : {},
    sample_count: Number.isFinite(Number(r.sample_count)) ? Number(r.sample_count) : 0,
    validation_score: Number.isFinite(Number(r.validation_score)) ? Number(r.validation_score) : null
  };
}

async function fetchChunk(ids: string[], month: number, productIds: string[] = []): Promise<SemanticMatchData> {
  const url = new URL(BASE);
  url.searchParams.set("ids", ids.join(","));
  if (productIds.length) url.searchParams.set("products", productIds.join(","));
  url.searchParams.set("month", String(month));
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5500), headers: { "user-agent": "travel-ai-semantic/7.0" } });
  if (!response.ok) throw new Error(`Semantic DB ${response.status}`);
  const payload = await response.json() as Record<string, unknown>;
  const destinations = Array.isArray(payload.destinations) ? payload.destinations.map(normalizeDestination).filter((x): x is DestinationSemanticProfile => Boolean(x)) : [];
  const stays = Array.isArray(payload.stays) ? payload.stays.map(normalizeStay).filter((x): x is StaySemanticProfile => Boolean(x)) : [];
  return { destinations, stays, model: normalizeModel(payload.model) };
}

export async function loadSemanticMatchData(destinationIds: string[], travelMonth: number, productIds: string[] = []): Promise<SemanticMatchData> {
  const uniqueIds = [...new Set(destinationIds.filter(Boolean))];
  if (!uniqueIds.length) return { destinations: [], stays: [], model: normalizeModel(null) };
  const chunks: string[][] = [];
  for (let i = 0; i < uniqueIds.length; i += 35) chunks.push(uniqueIds.slice(i, i + 35));
  const results = await Promise.all(chunks.map((chunk, index) => fetchChunk(chunk, travelMonth, index === 0 ? [...new Set(productIds)].slice(0, 100) : [])));
  const destinations = results.flatMap(x => x.destinations);
  const stays = results.flatMap(x => x.stays);
  return { destinations, stays, model: results.find(x => x.model.version)?.model ?? normalizeModel(null) };
}
