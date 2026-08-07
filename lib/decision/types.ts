import type { TripRequest } from "@/lib/validation/trip";

export type MonthKey = Exclude<TripRequest["month"], "flexible">;
export type MoodKey = TripRequest["moods"][number];
export type EvidenceStatus = "seed-estimate" | "verified" | "stale";

export interface DestinationSeed {
  id: string;
  name: string;
  country: string;
  region: "domestic" | "near-europe" | "europe";
  idealNights: [number, number];
  budgetBand: [number, number];
  season: Record<MonthKey, number>;
  moods: Record<MoodKey, number>;
  travelerFit: Record<TripRequest["travelerType"], number>;
  travelEffort: number;
  warmth: Record<MonthKey, number>;
  tags: string[];
  evidenceStatus: EvidenceStatus;
  evidenceNote: string;
}

export interface TripRecommendation {
  destinationId: string;
  destination: string;
  country: string;
  role: string;
  score: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
  tags: string[];
  estimatedBudget: string;
  freshness: EvidenceStatus;
  risk: string;
  breakdown: { constraints: number; intent: number; season: number; transport: number; budget: number; evidence: number };
}

export interface RecommendationResponse {
  request: TripRequest;
  generatedAt: string;
  mode: "deepseek-assisted" | "deterministic-fallback";
  dataSource: "supabase" | "seed-fallback";
  recommendations: TripRecommendation[];
}
