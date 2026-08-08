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
  starLevel?: number | null;
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
  fiveStarOfferCount: number;
  alternativeOfferCount: number;
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
  luxury: number;
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
  fiveStarOfferCount: number;
  alternativeOfferCount: number;
  demandScore: number;
  maxDiscount?: number | null;
  latitude?: number | null;
  longitude?: number | null;
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

export interface AffiliateDestinationDetailResponse {
  version: number;
  source: "linkwise-json-only";
  range: string;
  generatedAt: string;
  destinationId: string;
  offerCount: number;
  fiveStarCount: number;
  destination?: {
    location_label?: string | null;
    centroid_latitude?: number | null;
    centroid_longitude?: number | null;
    hero_image_url?: string | null;
    property_count?: number | null;
    offer_count?: number | null;
    min_price?: number | null;
    median_price?: number | null;
    max_price?: number | null;
    demand_score?: number | null;
    valid_to_max?: string | null;
  } | null;
  premiumOffers: AffiliateOffer[];
  premiumFill: AffiliateOffer[];
  alternatives: AffiliateOffer[];
}

export interface DestinationResearchPlace {
  id: string;
  name: string;
  category: "RESTAURANT" | "ATTRACTION" | "HOTEL" | "OTHER";
  summary?: string | null;
  whyItFits?: string | null;
  evidenceStrength?: "HIGH" | "MEDIUM" | "LOW";
  rating?: number | null;
  reviewCount?: number | null;
  imageUrl?: string | null;
  address?: string | null;
  distanceKm?: number | null;
  attribution?: string | null;
}

export interface DestinationResearchReview {
  id: string;
  title?: string | null;
  text?: string | null;
  rating?: number | null;
  publishedDate?: string | null;
  author?: string | null;
  evidenceStrength?: "HIGH" | "MEDIUM" | "LOW";
}

export interface DestinationResearchSource {
  title: string;
  url: string;
  domain: string;
  sourceType: "web" | "tripadvisor-reference";
}

export interface DestinationInsightsResponse {
  source: "openai-web-research" | "not-configured" | "unavailable";
  destination: string;
  researchedAt: string;
  overview?: string | null;
  restaurants: DestinationResearchPlace[];
  attractions: DestinationResearchPlace[];
  reviews: DestinationResearchReview[];
  practicalNotes: string[];
  sources: DestinationResearchSource[];
  attributionRequired: boolean;
}
