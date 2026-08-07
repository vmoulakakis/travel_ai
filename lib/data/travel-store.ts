import { destinationSeeds } from "@/lib/data/destinations";
import type { DestinationSeed, EvidenceStatus, MonthKey, MoodKey } from "@/lib/decision/types";
import type { TripRequest } from "@/lib/validation/trip";

type DbDestination = {
  id: string;
  name: string;
  country: string;
  region: DestinationSeed["region"];
  ideal_nights_min: number;
  ideal_nights_max: number;
  budget_low: number;
  budget_high: number;
  season: Record<string, number>;
  moods: Record<string, number>;
  traveler_fit: Record<string, number>;
  travel_effort: number;
  warmth: Record<string, number>;
  tags: string[];
  evidence_status: EvidenceStatus;
  evidence_note: string;
};

type DecisionDataResponse = { destinations?: DbDestination[] };

const months: MonthKey[] = ["september", "october", "november"];
const moods: MoodKey[] = ["relax", "romantic", "food", "warmth", "city", "nature", "adventure", "culture"];
const travelers: TripRequest["travelerType"][] = ["solo", "couple", "family", "friends"];
const num = (value: unknown, fallback = 60) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function mapDestination(row: DbDestination): DestinationSeed {
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    region: row.region,
    idealNights: [num(row.ideal_nights_min, 2), num(row.ideal_nights_max, 5)],
    budgetBand: [num(row.budget_low, 250), num(row.budget_high, 800)],
    season: Object.fromEntries(months.map((key) => [key, num(row.season?.[key])])) as DestinationSeed["season"],
    moods: Object.fromEntries(moods.map((key) => [key, num(row.moods?.[key])])) as DestinationSeed["moods"],
    travelerFit: Object.fromEntries(travelers.map((key) => [key, num(row.traveler_fit?.[key])])) as DestinationSeed["travelerFit"],
    travelEffort: num(row.travel_effort),
    warmth: Object.fromEntries(months.map((key) => [key, num(row.warmth?.[key])])) as DestinationSeed["warmth"],
    tags: Array.isArray(row.tags) ? row.tags : [],
    evidenceStatus: row.evidence_status ?? "seed-estimate",
    evidenceNote: row.evidence_note ?? "Imported travel intelligence; verify before booking claims."
  };
}

export async function loadDestinationSeeds(): Promise<{ destinations: DestinationSeed[]; source: "supabase" | "seed-fallback" }> {
  const url = process.env.SUPABASE_DECISION_DATA_URL ?? "https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/travel-decision-data";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: "no-store", headers: { "user-agent": "travel-ai/2.0" } });
    if (!response.ok) throw new Error(`Decision data ${response.status}`);
    const payload = await response.json() as DecisionDataResponse;
    const mapped = (payload.destinations ?? []).map(mapDestination).filter((item) => item.id && item.name);
    if (mapped.length < 3) throw new Error("Insufficient destination data");
    return { destinations: mapped, source: "supabase" };
  } catch {
    return { destinations: destinationSeeds, source: "seed-fallback" };
  } finally {
    clearTimeout(timer);
  }
}
