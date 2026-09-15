import { interpretIntentV8 } from "@/lib/ai/intent-v8";
import { createLLMRequestBudgetV16 } from "@/lib/ai/model-router-v9";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";
import {
  loadGlobalStaysV37,
  type GlobalStayV37,
  type V37DateFit,
  type V37MatchTier,
} from "@/lib/data/global-stays-v37";
import { preRankV8, toRecommendationsV8 } from "@/lib/decision/v8-matcher";
import {
  V8_DIMENSIONS,
  type V8Destination,
  type V8IntentProfile,
  type V8Recommendation,
  type V8RecommendationResponse,
} from "@/lib/decision/v8-types";
import type { TripRequest } from "@/lib/validation/trip";

export interface RankedStayV37 {
  sourceProductId: string;
  propertyName: string;
  trackingUrl: string;
  imageUrl: string | null;
  price: number | null;
  fullPrice: number | null;
  currency: string | null;
  discountPct: number | null;
  availability: string | null;
  inStock: boolean | null;
  city: string | null;
  address: string | null;
  distanceKm: number | null;
  score: number;
  semanticScore: number;
  valueScore: number;
  locationScore: number;
  evidenceScore: number;
  dateScore: number;
  reasons: string[];
  matchedSignals: string[];
  tradeoff: string;
  dateFit: V37DateFit;
  matchTier: V37MatchTier;
}

export interface EscapeSolutionV37 {
  rank: number;
  forwardRank: number;
  combinedScore: number;
  destinationScore: number;
  stayScore: number;
  inventoryDepth: number;
  inventoryCount: number;
  recommendation: V8Recommendation;
  stay: RankedStayV37;
  alternatives: RankedStayV37[];
  reasoning: {
    destination: string;
    stay: string;
    reverse: string;
    tradeoff: string;
  };
}

export interface EscapeSolutionResponseV37 {
  version: 37;
  generatedAt: string;
  request: TripRequest;
  profileSummary: string;
  candidateCount: number;
  inventoryChecked: number;
  inventoryOfferCount: number;
  solutionCount: number;
  sourceMode:
    | "global-exact"
    | "global-location-recovery"
    | "global-constraint-recovery"
    | "global-provider-check";
  relaxationsApplied: string[];
  diagnostics: {
    passes: string[];
    distinctDestinations: number;
    exactOffers: number;
    coreOffers: number;
    providerCheckOffers: number;
  };
  solutions: EscapeSolutionV37[];
}

type ProvisionalSolution = Omit<EscapeSolutionV37, "rank" | "reasoning"> & {
  relaxed: boolean;
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));
const say = (request: TripRequest, el: string, en: string) =>
  request.language === "en" ? en : el;
const requestedMustHave = (request: TripRequest) => request.mustHave ?? "none";

function discountPct(offer: GlobalStayV37): number | null {
  if (
    offer.fullPrice != null &&
    offer.price != null &&
    offer.fullPrice > offer.price &&
    offer.fullPrice > 0
  ) {
    return clamp(((offer.fullPrice - offer.price) / offer.fullPrice) * 100, 0, 90);
  }
  if (offer.discount != null && offer.discount > 0 && offer.discount <= 100) {
    return offer.discount;
  }
  return null;
}

function haystack(offer: GlobalStayV37) {
  return `${offer.propertyName} ${offer.description ?? ""} ${offer.category ?? ""} ${offer.city ?? ""} ${offer.address ?? ""} ${JSON.stringify(offer.raw ?? {})}`.toLowerCase();
}

const signals = [
  { id: "sea", re: /beach|beachfront|seaside|sea view|coast|παραλ|θάλασσ|θαλασσ/i, el: "θάλασσα / παραλία", en: "sea / beach" },
  { id: "nature", re: /garden|forest|mountain|nature|eco|rural|vineyard|κήπ|βουν|φύσ|φυση/i, el: "φύση", en: "nature" },
  { id: "wellness", re: /spa|wellness|massage|thermal|sauna|hamam|hammam|ευεξ/i, el: "wellness / spa", en: "wellness / spa" },
  { id: "romantic", re: /boutique|suite|adults only|romantic|honeymoon|private|μπουτίκ|σουίτα/i, el: "boutique / romantic", en: "boutique / romantic" },
  { id: "family", re: /family|kids|children|apartment|kitchen|family room|παιδ|οικογεν|διαμέρισμα|διαμερισμα/i, el: "family-friendly", en: "family-friendly" },
  { id: "city", re: /old town|historic|centre|center|downtown|city centre|κέντρο|κεντρο|παλιά πόλη|παλια πολη/i, el: "κεντρική / city βάση", en: "central / city base" },
  { id: "pool", re: /pool|swimming|πισίνα|πισινα/i, el: "πισίνα", en: "pool" },
  { id: "luxury", re: /luxury|5 star|5\*|resort|premium|deluxe|πολυτελ/i, el: "premium χαρακτήρα", en: "premium character" },
  { id: "nightlife", re: /nightlife|bar|club|night|βραδ|μπαρ/i, el: "βραδινή ζωή", en: "nightlife" },
  { id: "culture", re: /historic|museum|old town|heritage|castle|ιστορ|μουσεί|μουσει|κάστρο|καστρο/i, el: "κουλτούρα / ιστορία", en: "culture / history" },
] as const;

function desiredSignals(request: TripRequest) {
  const wanted = new Set<string>();
  for (const mood of request.moods) {
    if (mood === "romantic") wanted.add("romantic");
    if (mood === "nature") wanted.add("nature");
    if (mood === "city" || mood === "food") wanted.add("city");
    if (mood === "culture") wanted.add("culture");
    if (mood === "relax") wanted.add("wellness");
    if (mood === "warmth") wanted.add("sea");
  }
  const mustHave = requestedMustHave(request);
  if (mustHave !== "none") wanted.add(mustHave === "nightlife" ? "nightlife" : mustHave);
  if (request.travelerType === "family") wanted.add("family");
  if (request.hotelStyle === "luxury") wanted.add("luxury");
  if (request.hotelStyle === "boutique") wanted.add("romantic");
  if (request.hotelStyle === "resort") wanted.add("pool");
  return wanted;
}

function styleFit(request: TripRequest, text: string) {
  const style = request.hotelStyle ?? "any";
  if (style === "any") return 0;
  if (style === "luxury") return /luxury|5 star|5\*|premium|deluxe|πολυτελ/i.test(text) ? 10 : -5;
  if (style === "boutique") return /boutique|suite|design|private|μπουτίκ|σουίτα/i.test(text) ? 10 : -4;
  if (style === "resort") return /resort|pool|spa|all inclusive/i.test(text) ? 10 : -4;
  if (style === "value") return 5;
  return 0;
}

function scoreStay(offer: GlobalStayV37, request: TripRequest): RankedStayV37 | null {
  if (offer.inStock === false) return null;
  const text = haystack(offer);
  const wanted = desiredSignals(request);
  const matched = signals.filter((signal) => wanted.has(signal.id) && signal.re.test(text));
  const missing = [...wanted].filter(
    (id) => !signals.some((signal) => signal.id === id && signal.re.test(text)),
  );

  const semanticScore = clamp(
    46 +
      matched.length * 11 +
      styleFit(request, text) +
      (request.travelerType === "couple" && /adults only|boutique|suite|private/i.test(text) ? 7 : 0) +
      (request.travelerType === "family" && /family|kids|apartment|kitchen/i.test(text) ? 9 : 0) -
      Math.min(18, missing.length * 4),
  );

  const discount = discountPct(offer);
  let valueScore = 55;
  if (offer.price != null && offer.price > 0) {
    const ratio = offer.price / Math.max(1, request.budget);
    valueScore =
      ratio <= 0.3 ? 94 : ratio <= 0.55 ? 88 : ratio <= 0.8 ? 78 : ratio <= 1 ? 68 : ratio <= 1.3 ? 52 : ratio <= 1.8 ? 38 : 25;
  }
  if (discount != null) valueScore = clamp(valueScore + Math.min(12, discount * 0.3));
  if (request.avoid === "high-cost" && valueScore < 50) valueScore -= 8;

  const locationScore =
    offer.distanceKm == null ? 52 : offer.distanceKm <= 2 ? 96 : offer.distanceKm <= 7 ? 88 : offer.distanceKm <= 15 ? 76 : offer.distanceKm <= 30 ? 62 : offer.distanceKm <= 50 ? 48 : 35;
  const evidenceScore = clamp(
    (offer.imageUrl || offer.thumbUrl ? 18 : 5) +
      (offer.description ? 20 : 8) +
      (offer.address || offer.city ? 16 : 6) +
      (offer.distanceKm != null ? 16 : 5) +
      (offer.trackingUrl ? 18 : 0) +
      (offer.validFrom && offer.validTo ? 12 : 5),
  );
  const dateScore = offer.dateFit === "exact" ? 100 : offer.dateFit === "overlap" ? 70 : 42;
  const geographyScore = offer.matchTier === "core" ? 100 : 58;
  const score = Math.round(
    clamp(
      semanticScore * 0.31 +
        valueScore * 0.18 +
        locationScore * 0.15 +
        evidenceScore * 0.14 +
        dateScore * 0.14 +
        geographyScore * 0.08,
    ),
  );

  const reasons: string[] = [];
  if (matched.length) {
    reasons.push(
      say(
        request,
        `Ταιριάζει στα κριτήριά σου: ${matched.slice(0, 4).map((item) => item.el).join(", ")}.`,
        `Matches your criteria: ${matched.slice(0, 4).map((item) => item.en).join(", ")}.`,
      ),
    );
  }
  if (offer.dateFit === "exact") {
    reasons.push(say(request, "Το feed καλύπτει ολόκληρο το επιλεγμένο date window.", "The feed validity covers the full selected date window."));
  } else if (offer.dateFit === "overlap") {
    reasons.push(say(request, "Το feed επικαλύπτει μέρος του date window — χρειάζεται επιβεβαίωση πριν κλειδώσεις ημερομηνίες.", "The feed overlaps part of the date window — confirm dates before committing."));
  } else {
    reasons.push(say(request, "Το κατάλυμα υπάρχει στο ενεργό joined inventory, αλλά οι συγκεκριμένες ημερομηνίες χρειάζονται επιβεβαίωση στον πάροχο.", "The stay exists in active joined inventory, but these exact dates need provider confirmation."));
  }
  if (offer.distanceKm != null) {
    reasons.push(say(request, `Περίπου ${offer.distanceKm.toFixed(1)} km από τον canonical προορισμό.`, `About ${offer.distanceKm.toFixed(1)} km from the canonical destination.`));
  }
  if (offer.price != null) {
    reasons.push(say(request, `Feed price signal: ${offer.currency ?? "EUR"} ${Math.round(offer.price)} — όχι εγγυημένη τελική τιμή κράτησης.`, `Feed price signal: ${offer.currency ?? "EUR"} ${Math.round(offer.price)} — not a guaranteed final booking price.`));
  }

  let tradeoff = say(request, "Τελική τιμή, τύπος δωματίου και live availability επιβεβαιώνονται πάντα στον πάροχο.", "Final price, room type and live availability are always confirmed with the provider.");
  if (offer.matchTier === "nearby") {
    tradeoff = say(request, "Είναι nearby επιλογή και όχι στον στενό πυρήνα του προορισμού — έλεγξε τη μετακίνηση.", "This is a nearby option rather than in the destination core — check transport.");
  }
  if (offer.dateFit !== "exact") {
    tradeoff = say(request, "Δεν παρουσιάζω τις ημερομηνίες ως επιβεβαιωμένη διαθεσιμότητα· ο πάροχος πρέπει να τις επιβεβαιώσει.", "I do not present these dates as confirmed availability; the provider must confirm them.");
  }

  return {
    sourceProductId: offer.sourceProductId,
    propertyName: offer.propertyName,
    trackingUrl: offer.trackingUrl,
    imageUrl: offer.imageUrl ?? offer.thumbUrl ?? null,
    price: offer.price ?? null,
    fullPrice: offer.fullPrice ?? null,
    currency: offer.currency ?? null,
    discountPct: discount,
    availability: offer.availability ?? null,
    inStock: offer.inStock ?? null,
    city: offer.city ?? null,
    address: offer.address ?? null,
    distanceKm: offer.distanceKm ?? null,
    score,
    semanticScore: Math.round(semanticScore),
    valueScore: Math.round(valueScore),
    locationScore: Math.round(locationScore),
    evidenceScore: Math.round(evidenceScore),
    dateScore,
    reasons: reasons.slice(0, 5),
    matchedSignals: matched.map((item) => (request.language === "en" ? item.en : item.el)).slice(0, 6),
    tradeoff,
    dateFit: offer.dateFit,
    matchTier: offer.matchTier,
  };
}

export function structuredIntentV37(request: TripRequest): V8IntentProfile {
  const weights = Object.fromEntries(V8_DIMENSIONS.map((dimension) => [dimension, 0.05])) as Record<(typeof V8_DIMENSIONS)[number], number>;
  for (const mood of request.moods) weights[mood === "warmth" ? "warmth" : mood] = 1;
  const mustHave = requestedMustHave(request);
  if (mustHave !== "none") weights[mustHave === "sea" ? "beach" : mustHave] = 1;
  if (request.travelerType === "family") weights.family = 0.9;
  if (request.desiredEnergy === "restore") {
    weights.relax = Math.max(weights.relax, 0.95);
    weights.wellness = 0.7;
  }
  if (request.hotelStyle === "luxury") weights.luxury = 0.8;
  if (request.hotelStyle === "value") weights.value = 0.9;
  return {
    weights,
    source: "structured",
    summary: say(request, "Structured fallback intent από τα δηλωμένα κριτήρια.", "Structured fallback intent from the declared criteria."),
  };
}

async function resolveIntent(request: TripRequest, base: V8RecommendationResponse | null) {
  if (base?.intent) return base.intent;
  try {
    return await interpretIntentV8(request, createLLMRequestBudgetV16());
  } catch {
    return structuredIntentV37(request);
  }
}

function fallbackRecommendation(destination: V8Destination): V8Recommendation {
  return {
    slug: destination.slug,
    destination: destination.nameEl,
    destinationEn: destination.nameEn,
    country: destination.countryEl,
    countryCode: destination.countryCode,
    regionGroup: destination.regionGroup,
    role: "INVENTORY_RECOVERY",
    explorationRole: "ALTERNATIVE",
    explorationReason: "Real stay-backed recovery candidate",
    score: 55,
    fitStatus: "compromise",
    confidence: "MEDIUM",
    why: "Real stay inventory exists; semantic fit is a recovery estimate.",
    seasonNote: "Season fit requires final verification.",
    effortLabel: destination.effortAthens,
    budgetLabel: `tier ${destination.costTier}`,
    tags: destination.tags,
    latitude: destination.latitude,
    longitude: destination.longitude,
    directFromAthens: destination.directFromAthens,
    routeConfidence: destination.routeConfidence,
    breakdown: {
      intent: 55,
      season: 55,
      effort: 55,
      duration: 55,
      budget: 55,
      weather: 55,
      traveler: 55,
      crowdFit: 55,
      routeConfidence: Math.round(destination.routeConfidence * 100),
    },
  };
}

function mergeOffers(base: GlobalStayV37[], more: GlobalStayV37[]) {
  const merged = new Map(base.map((offer) => [offer.sourceProductId, offer]));
  for (const offer of more) {
    const existing = merged.get(offer.sourceProductId);
    if (
      !existing ||
      (existing.dateFit !== "exact" && offer.dateFit === "exact") ||
      (existing.matchTier === "nearby" && offer.matchTier === "core")
    ) {
      merged.set(offer.sourceProductId, offer);
    }
  }
  return [...merged.values()];
}

function distinctDestinations(rows: GlobalStayV37[]) {
  return new Set(rows.map((row) => row.destinationSlug)).size;
}

export async function buildEscapeSolutionsV37(
  request: TripRequest,
  base: V8RecommendationResponse | null,
  maxSolutions = 10,
): Promise<EscapeSolutionResponseV37> {
  const [intent, catalog] = await Promise.all([resolveIntent(request, base), loadV8DestinationCatalog()]);
  const passes: string[] = [];
  const relaxations: string[] = [];

  let offers = await loadGlobalStaysV37(request.startDate, request.endDate, "exact", false, 120);
  passes.push(`exact-core:${offers.length}`);
  let mode: EscapeSolutionResponseV37["sourceMode"] = "global-exact";

  if (distinctDestinations(offers) < Math.min(maxSolutions, 10)) {
    const more = await loadGlobalStaysV37(request.startDate, request.endDate, "exact", true, 120);
    offers = mergeOffers(offers, more);
    passes.push(`exact-nearby:${more.length}`);
    mode = "global-location-recovery";
    relaxations.push("location_radius");
  }
  if (distinctDestinations(offers) < Math.min(maxSolutions, 10) && request.dateFlexibility !== "fixed") {
    const more = await loadGlobalStaysV37(request.startDate, request.endDate, "overlap", true, 120);
    offers = mergeOffers(offers, more);
    passes.push(`date-overlap:${more.length}`);
    mode = "global-constraint-recovery";
    relaxations.push("date_overlap");
  }
  if (distinctDestinations(offers) < Math.min(maxSolutions, 6)) {
    const more = await loadGlobalStaysV37(request.startDate, request.endDate, "listed", true, 120);
    offers = mergeOffers(offers, more);
    passes.push(`provider-check:${more.length}`);
    mode = "global-provider-check";
    relaxations.push("provider_date_check");
  }
  if (!offers.length) throw new Error("REAL_STAY_INVENTORY_EMPTY");

  const strictRank = preRankV8(request, intent, catalog, catalog.length);
  const strictRecommendations = toRecommendationsV8(request, strictRank, catalog.length);
  const strictMap = new Map(strictRecommendations.map((recommendation, index) => [recommendation.slug, { rec: recommendation, rank: index + 1 }]));

  const relaxedRequest: TripRequest = {
    ...request,
    mustHave: "none",
    avoid: "none",
    distancePreference: "any",
  };
  const relaxedRank = preRankV8(relaxedRequest, intent, catalog, catalog.length);
  const relaxedRecommendations = toRecommendationsV8(relaxedRequest, relaxedRank, catalog.length);
  const relaxedMap = new Map(
    relaxedRecommendations.map((recommendation, index) => [
      recommendation.slug,
      { rec: { ...recommendation, fitStatus: "compromise" as const }, rank: index + 1 },
    ]),
  );

  const catalogMap = new Map(catalog.map((destination) => [destination.slug, destination]));
  const groups = new Map<string, GlobalStayV37[]>();
  for (const offer of offers) {
    const rows = groups.get(offer.destinationSlug) ?? [];
    rows.push(offer);
    groups.set(offer.destinationSlug, rows);
  }

  const provisional: ProvisionalSolution[] = [];
  for (const [slug, rawOffers] of groups) {
    const strict = strictMap.get(slug);
    const soft = strict ?? relaxedMap.get(slug);
    const destination = catalogMap.get(slug);
    if (!soft && !destination) continue;

    const recommendation = soft?.rec ?? fallbackRecommendation(destination!);
    const forwardRank = soft?.rank ?? 999;
    const relaxed = !strict;
    const ranked = rawOffers
      .map((offer) => scoreStay(offer, request))
      .filter((offer): offer is RankedStayV37 => Boolean(offer))
      .sort((a, b) => b.score - a.score || (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER));
    if (!ranked.length) continue;

    const best = ranked[0];
    const inventoryCount = ranked.length;
    const inventoryDepth = Math.round(clamp((Math.min(inventoryCount, 15) / 15) * 100));
    const stayScore = Math.round(clamp(best.score * 0.8 + inventoryDepth * 0.2));
    const destinationScore = Math.round(recommendation.score);
    const combinedScore = Math.round(clamp(destinationScore * 0.52 + stayScore * 0.48 - (relaxed ? 5 : 0)));
    provisional.push({
      forwardRank,
      combinedScore,
      destinationScore,
      stayScore,
      inventoryDepth,
      inventoryCount,
      recommendation,
      stay: best,
      alternatives: ranked.slice(1, 8),
      relaxed,
    });
  }

  provisional.sort(
    (a, b) => b.combinedScore - a.combinedScore || b.stayScore - a.stayScore || b.inventoryCount - a.inventoryCount,
  );
  const picked = provisional.slice(0, Math.max(1, Math.min(10, maxSolutions)));
  if (picked.some((item) => item.relaxed)) {
    if (mode === "global-exact") mode = "global-constraint-recovery";
    relaxations.push("soft_destination_constraints");
  }

  const solutions: EscapeSolutionV37[] = picked.map((item, index) => {
    const delta = item.forwardRank - (index + 1);
    const reverse =
      delta > 0
        ? say(request, `Το πραγματικό stay inventory ανέβασε αυτή την επιλογή κατά ${delta} θέση/εις.`, `Real stay inventory moved this option up ${delta} place(s).`)
        : delta < 0
          ? say(request, `Το destination fit ήταν ισχυρότερο από το stay fit· το inventory την κατέβασε ${Math.abs(delta)} θέση/εις.`, `Destination fit was stronger than stay fit; inventory moved it down ${Math.abs(delta)} place(s).`)
          : say(request, "Destination fit και stay fit συμφωνούν.", "Destination fit and stay fit agree.");
    return {
      rank: index + 1,
      forwardRank: item.forwardRank,
      combinedScore: item.combinedScore,
      destinationScore: item.destinationScore,
      stayScore: item.stayScore,
      inventoryDepth: item.inventoryDepth,
      inventoryCount: item.inventoryCount,
      recommendation: item.recommendation,
      stay: item.stay,
      alternatives: item.alternatives,
      reasoning: {
        destination: item.recommendation.why || say(request, "Ταιριάζει στο συνολικό travel profile.", "It fits the overall travel profile."),
        stay: item.stay.reasons[0] ?? say(request, "Το κατάλυμα είναι πραγματικό stay-backed candidate.", "The stay is a real inventory-backed candidate."),
        reverse,
        tradeoff: item.stay.tradeoff,
      },
    };
  });

  const uniqueOffers = new Set(offers.map((offer) => offer.sourceProductId));
  return {
    version: 37,
    generatedAt: new Date().toISOString(),
    request,
    profileSummary: base?.profileSummary ?? intent.summary,
    candidateCount: catalog.length,
    inventoryChecked: offers.length,
    inventoryOfferCount: uniqueOffers.size,
    solutionCount: solutions.length,
    sourceMode: mode,
    relaxationsApplied: [...new Set(relaxations)],
    diagnostics: {
      passes,
      distinctDestinations: distinctDestinations(offers),
      exactOffers: offers.filter((offer) => offer.dateFit === "exact").length,
      coreOffers: offers.filter((offer) => offer.matchTier === "core").length,
      providerCheckOffers: offers.filter((offer) => offer.dateFit === "provider_check").length,
    },
    solutions,
  };
}
