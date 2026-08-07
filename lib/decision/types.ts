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
  imageUrl?: string;
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
  imageUrl?: string;
  breakdown: { constraints: number; intent: number; season: number; transport: number; budget: number; evidence: number };
}

export interface RecommendationResponse {
  request: TripRequest;
  generatedAt: string;
  mode: "deepseek-assisted" | "deterministic-fallback";
  dataSource: "supabase" | "seed-fallback";
  recommendations: TripRecommendation[];
}

export interface AffiliateOffer {
  sourceProductId: string;
  propertyName: string;
  description?: string | null;
  category?: string | null;
  programId?: string | null;
  trackingUrl: string;
  imageUrl?: string | null;
  thumbUrl?: string | null;
  availability?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  currency?: string | null;
  price?: number | null;
  fullPrice?: number | null;
  discount?: number | null;
  demandSignal?: number | null;
  modelName?: string | null;
  brandName?: string | null;
  custom?: unknown;
  extraImages?: unknown;
  variations?: unknown;
}

export interface AffiliateDestinationCandidate {
  destinationId: string;
  locationLabel: string;
  countryHint?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  propertyCount: number;
  activeOfferCount: number;
  minPrice?: number | null;
  medianPrice?: number | null;
  maxPrice?: number | null;
  currency?: string | null;
  demandScore: number;
  saleOfferCount: number;
  maxDiscount?: number | null;
  avgDiscount?: number | null;
  heroImageUrl?: string | null;
  validToMax?: string | null;
  semanticText?: string | null;
  topOffers: AffiliateOffer[];
}

export interface GuruScoreBreakdown {
  supply: number;
  value: number;
  demand: number;
  deal: number;
  intent: number;
  effort: number;
}

export interface GuruRecommendation {
  destinationId: string;
  destination: string;
  country: string;
  role: string;
  score: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  whyThisPlace: string;
  whyNow: string;
  tags: string[];
  imageUrl?: string | null;
  feedPriceLabel: string;
  propertyCount: number;
  activeOfferCount: number;
  demandScore: number;
  maxDiscount?: number | null;
  distanceKm?: number | null;
  breakdown: GuruScoreBreakdown;
  offers: AffiliateOffer[];
}

export interface GuruRecommendationResponse {
  request: TripRequest;
  generatedAt: string;
  mode: "travel-guru-deepseek" | "deterministic-affiliate-fallback";
  source: "linkwise-json-only";
  candidateCount: number;
  affiliateOnly: true;
  recommendations: GuruRecommendation[];
}
