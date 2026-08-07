import type { AffiliateDestinationCandidate, AffiliateOffer } from "@/lib/decision/types";
import type { TripRequest } from "@/lib/validation/trip";

type ApiOffer = Record<string, unknown>;
type ApiCandidate = Record<string, unknown> & { top_offers?: ApiOffer[] };
type ApiResponse = { source?: string; candidateCount?: number; candidates?: ApiCandidate[] };

const monthMap: Record<Exclude<TripRequest["month"], "flexible">, string> = {
  september: "09",
  october: "10",
  november: "11"
};
const num = (v: unknown) => Number.isFinite(Number(v)) ? Number(v) : null;
const text = (v: unknown) => typeof v === "string" && v.trim() ? v.trim() : null;

function mapOffer(row: ApiOffer): AffiliateOffer | null {
  const trackingUrl = text(row.tracking_url);
  const sourceProductId = text(row.source_product_id);
  const propertyName = text(row.property_name);
  if (!trackingUrl || !sourceProductId || !propertyName || !trackingUrl.startsWith("https://go.linkwi.se/")) return null;
  return {
    sourceProductId,
    propertyName,
    description: text(row.description),
    category: text(row.source_category),
    programId: text(row.program_id),
    trackingUrl,
    imageUrl: text(row.image_url),
    thumbUrl: text(row.thumb_url),
    availability: text(row.availability),
    validFrom: text(row.valid_from),
    validTo: text(row.valid_to),
    currency: text(row.currency),
    price: num(row.price),
    fullPrice: num(row.full_price),
    discount: num(row.discount),
    demandSignal: num(row.demand_proxy),
    modelName: text(row.model_name),
    brandName: text(row.brand_name),
    custom: row.custom,
    extraImages: row.extra_images,
    variations: row.variations
  };
}

function mapCandidate(row: ApiCandidate): AffiliateDestinationCandidate | null {
  const destinationId = text(row.destination_id);
  const locationLabel = text(row.location_label);
  if (!destinationId || !locationLabel) return null;
  const topOffers = Array.isArray(row.top_offers) ? row.top_offers.map(mapOffer).filter((x): x is AffiliateOffer => Boolean(x)) : [];
  if (!topOffers.length) return null;
  return {
    destinationId,
    locationLabel,
    countryHint: text(row.country_hint),
    latitude: num(row.centroid_latitude),
    longitude: num(row.centroid_longitude),
    propertyCount: Number(row.property_count ?? 0),
    activeOfferCount: Number(row.active_offer_count ?? 0),
    minPrice: num(row.min_price),
    medianPrice: num(row.median_price),
    maxPrice: num(row.max_price),
    currency: text(row.currency),
    demandScore: Number(row.demand_score ?? 0),
    saleOfferCount: Number(row.sale_offer_count ?? 0),
    maxDiscount: num(row.max_discount),
    avgDiscount: num(row.avg_discount),
    heroImageUrl: text(row.hero_image_url),
    validToMax: text(row.valid_to_max),
    semanticText: text(row.semantic_text),
    topOffers
  };
}

function monthParam(month: TripRequest["month"]): string {
  if (month === "flexible") return "flexible";
  const year = new Date().getUTCFullYear();
  return `${year}-${monthMap[month]}`;
}

export async function loadAffiliateUniverse(request: TripRequest, limit = 100): Promise<AffiliateDestinationCandidate[]> {
  const base = process.env.SUPABASE_AFFILIATE_TRAVEL_DATA_URL ?? "https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/affiliate-travel-data";
  const url = `${base}?month=${encodeURIComponent(monthParam(request.month))}&limit=${Math.max(12, Math.min(limit, 120))}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal, headers: { "user-agent": "travel-ai-guru/1.0" } });
    if (!response.ok) throw new Error(`Affiliate universe ${response.status}`);
    const payload = await response.json() as ApiResponse;
    return (payload.candidates ?? []).map(mapCandidate).filter((x): x is AffiliateDestinationCandidate => Boolean(x));
  } finally {
    clearTimeout(timer);
  }
}

export async function loadFeaturedAffiliateDestinations(limit = 4): Promise<Array<{ destinationId: string; locationLabel: string; imageUrl: string }>> {
  const request: TripRequest = { origin: "Athens", month: "flexible", nights: 3, budget: 500, moods: ["relax"], travelerType: "couple" };
  const candidates = await loadAffiliateUniverse(request, Math.max(12, limit * 3));
  return candidates.filter((c) => c.heroImageUrl).slice(0, limit).map((c) => ({ destinationId: c.destinationId, locationLabel: c.locationLabel, imageUrl: c.heroImageUrl as string }));
}
