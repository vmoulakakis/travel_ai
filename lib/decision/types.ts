import type { TripRequest } from "@/lib/validation/trip";

export type MonthKey = Exclude<TripRequest["month"], "flexible">;
export type MoodKey = TripRequest["moods"][number];
export type EvidenceStatus = "seed-estimate" | "verified" | "stale";
export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export interface WeatherEvidence { source: "forecast" | "seasonal" | "climatology" | "unavailable"; sourceLabel: string; score: number; confidence: Confidence; typical: boolean; temperatureMinC?: number | null; temperatureMeanC?: number | null; temperatureMaxC?: number | null; precipitationMmDay?: number | null; windKmh?: number | null; sunSignal?: number | null; goodWeatherDays?: number | null; totalDays?: number | null; summary: string; researchedAt: string; }
export interface SemanticMedia { url: string; source: "linkwise" | "wikimedia" | "official" | "manual"; attribution?: string | null; quality?: number | null; focal_x?: number | null; focal_y?: number | null; }
export interface SemanticLearning { selections?: number; outbound_clicks?: number; conversions?: number; reward?: number; }
export interface DestinationSemanticProfile { destination_id: string; location_label: string; vector: number[]; archetypes: string[]; confidence: number; evidence?: Record<string, unknown>; learning?: SemanticLearning; media?: SemanticMedia[]; }
export interface StaySemanticProfile { source_product_id: string; destination_id?: string | null; property_name: string; vector: number[]; confidence: number; evidence?: Record<string, unknown>; }
export interface SemanticModelState { version: string; architecture?: Record<string, unknown>; weights?: Record<string, unknown>; sample_count: number; validation_score?: number | null; }
export interface SemanticMatchData { destinations: DestinationSemanticProfile[]; stays: StaySemanticProfile[]; model: SemanticModelState; }

export interface DestinationSeed { id: string; name: string; country: string; region: "domestic" | "near-europe" | "europe"; idealNights: [number, number]; budgetBand: [number, number]; season: Record<MonthKey, number>; moods: Record<MoodKey, number>; travelerFit: Record<TripRequest["travelerType"], number>; travelEffort: number; warmth: Record<MonthKey, number>; tags: string[]; evidenceStatus: EvidenceStatus; evidenceNote: string; imageUrl?: string; }
export interface TripRecommendation { destinationId: string; destination: string; country: string; role: string; score: number; confidence: Confidence; reason: string; tags: string[]; estimatedBudget: string; freshness: EvidenceStatus; risk: string; imageUrl?: string; breakdown: { constraints: number; intent: number; season: number; transport: number; budget: number; evidence: number }; }
export interface RecommendationResponse { request: TripRequest; generatedAt: string; mode: "deepseek-assisted" | "deterministic-fallback"; dataSource: "supabase" | "seed-fallback"; recommendations: TripRecommendation[]; }

export interface AffiliateOffer { sourceProductId: string; propertyName: string; description?: string | null; category?: string | null; programId?: string | null; trackingUrl: string; imageUrl?: string | null; thumbUrl?: string | null; availability?: string | null; validFrom?: string | null; validTo?: string | null; currency?: string | null; price?: number | null; fullPrice?: number | null; discount?: number | null; demandSignal?: number | null; starLevel?: number | null; modelName?: string | null; brandName?: string | null; custom?: unknown; extraImages?: unknown; variations?: unknown; semanticScore?: number | null; }
export interface AffiliateDestinationCandidate { destinationId: string; locationLabel: string; countryHint?: string | null; latitude?: number | null; longitude?: number | null; propertyCount: number; activeOfferCount: number; fiveStarOfferCount: number; alternativeOfferCount: number; minPrice?: number | null; medianPrice?: number | null; maxPrice?: number | null; currency?: string | null; demandScore: number; saleOfferCount: number; maxDiscount?: number | null; avgDiscount?: number | null; heroImageUrl?: string | null; validToMax?: string | null; semanticText?: string | null; topOffers: AffiliateOffer[]; weather?: WeatherEvidence | null; semanticProfile?: DestinationSemanticProfile | null; semanticScore?: number; neuralScore?: number; staySemanticScore?: number; }
export interface GuruScoreBreakdown { semantic: number; neural: number; supply: number; value: number; demand: number; deal: number; intent: number; effort: number; luxury: number; weather: number; seasonality: number; stayFit: number; }
export interface GuruRecommendation { destinationId: string; destination: string; country: string; role: string; score: number; confidence: Confidence; whyThisPlace: string; whyNow: string; tags: string[]; imageUrl?: string | null; feedPriceLabel: string; propertyCount: number; activeOfferCount: number; fiveStarOfferCount: number; alternativeOfferCount: number; demandScore: number; maxDiscount?: number | null; latitude?: number | null; longitude?: number | null; distanceKm?: number | null; breakdown: GuruScoreBreakdown; offers: AffiliateOffer[]; weather?: WeatherEvidence | null; verifier?: { checked: boolean; passed: boolean; reason?: string | null; model?: string | null }; }
export interface GuruRecommendationResponse { request: TripRequest; generatedAt: string; mode: "semantic-neural-deepseek" | "semantic-neural" | "deterministic-affiliate-fallback"; source: "linkwise+semantic-db"; candidateCount: number; weatherScreenedCount?: number; affiliateOnly: true; recommendations: GuruRecommendation[]; modelVersion?: string; modelSampleCount?: number; verifierUsed?: boolean; }

export interface AffiliateDestinationDetailResponse { version: number; source: "linkwise-json-only"; range: string; generatedAt: string; destinationId: string; offerCount: number; fiveStarCount: number; destination?: { location_label?: string | null; centroid_latitude?: number | null; centroid_longitude?: number | null; hero_image_url?: string | null; property_count?: number | null; offer_count?: number | null; min_price?: number | null; median_price?: number | null; max_price?: number | null; demand_score?: number | null; valid_to_max?: string | null; } | null; premiumOffers: AffiliateOffer[]; premiumFill: AffiliateOffer[]; alternatives: AffiliateOffer[]; }

export interface DestinationResearchPlace { id: string; name: string; category: "RESTAURANT" | "ATTRACTION" | "HOTEL" | "OTHER"; summary?: string | null; whyItFits?: string | null; evidenceStrength?: Confidence; rating?: number | null; reviewCount?: number | null; imageUrl?: string | null; address?: string | null; distanceKm?: number | null; attribution?: string | null; }
export interface DestinationResearchReview { id: string; title?: string | null; text?: string | null; rating?: number | null; publishedDate?: string | null; author?: string | null; evidenceStrength?: Confidence; }
export interface DestinationResearchSource { title: string; url: string; domain: string; sourceType: "web" | "tripadvisor-reference"; }
export type DestinationEvidenceKind = "tripadvisor_destination_rank" | "tripadvisor_place_rank" | "tripadvisor_rating" | "booking_property_presence" | "booking_property_rating" | "official_event" | "official_place" | "seasonal_note" | "demand_signal";
export interface DestinationEvidenceItem {
  id: string;
  kind: DestinationEvidenceKind;
  subjectName: string;
  provider: string;
  headline: string;
  summary?: string | null;
  rank?: number | null;
  rating?: number | null;
  ratingScale?: number | null;
  reviewCount?: number | null;
  sourceProductId?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  sourceMonth?: string | null;
  observedAt: string;
  expiresAt: string;
  confidence: Confidence;
}
export interface DestinationEvidenceBundle {
  destinationId: string;
  checkedAt: string;
  tripadvisor: DestinationEvidenceItem[];
  booking: DestinationEvidenceItem[];
  events: DestinationEvidenceItem[];
  places: DestinationEvidenceItem[];
  seasonal: DestinationEvidenceItem[];
  hasCurrentRanking: boolean;
  hasDateMatchedEvents: boolean;
}
export interface DestinationInsightsResponse { source: "verified-synthesis" | "research-pending" | "unavailable"; destination: string; researchedAt: string; overview?: string | null; restaurants: DestinationResearchPlace[]; attractions: DestinationResearchPlace[]; reviews: DestinationResearchReview[]; practicalNotes: string[]; sources: DestinationResearchSource[]; attributionRequired: boolean; evidence?: DestinationEvidenceBundle; }
