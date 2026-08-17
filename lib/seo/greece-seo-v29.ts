import type { V8Destination, V8Dimension } from "@/lib/decision/v8-types";
import { createLLMRequestBudgetV16, generateJsonWithRoutingV16 } from "@/lib/ai/model-router-v9";
import { destinationSeo } from "@/lib/seo/destination-content";

export type SeoLocaleV29 = "el-GR" | "en-GB";

type TagCopy = { label: string; promise: string; query: string };
const englishTagCopy: Partial<Record<V8Dimension, TagCopy>> = {
  beach: { label: "beaches", promise: "easy access to memorable coast and swimming", query: "beach vacation" },
  nature: { label: "nature", promise: "landscapes that genuinely change the pace of the trip", query: "nature vacation" },
  culture: { label: "culture", promise: "history, local life and cultural depth", query: "cultural trip" },
  food: { label: "food", promise: "food and local produce that become part of the journey", query: "food travel" },
  romantic: { label: "couples", promise: "space for a romantic trip without an overloaded schedule", query: "romantic vacation" },
  family: { label: "family", promise: "a pace that can work for children and adults", query: "family vacation" },
  nightlife: { label: "nightlife", promise: "energy that continues after sunset", query: "nightlife vacation" },
  adventure: { label: "adventure", promise: "movement, exploration and active days", query: "active vacation" },
  value: { label: "value", promise: "more trip value without unnecessary spend", query: "budget vacation" },
  short_break: { label: "short break", promise: "a meaningful change of scene in a few days", query: "short break" },
  luxury: { label: "luxury", promise: "high-comfort stays and premium experiences", query: "luxury vacation" },
  wellness: { label: "wellness", promise: "slower days with room for recovery", query: "wellness vacation" },
  city: { label: "city", promise: "urban energy, food and culture within easy reach", query: "city break" },
  warmth: { label: "sun", promise: "sunshine and warm-weather travel", query: "sun vacation" },
  shoulder_season: { label: "shoulder season", promise: "a stronger balance of weather, crowds and value", query: "shoulder season travel" },
  relax: { label: "relaxation", promise: "a calmer rhythm with less pressure to keep moving", query: "relaxing vacation" },
};

export function destinationSeoEn(destination: V8Destination) {
  const traits = destination.tags.map(tag => englishTagCopy[tag]).filter((item): item is TagCopy => Boolean(item));
  const primary = traits[0] ?? { label: "Greece", promise: "a distinctive Greek travel experience", query: "Greece vacation" };
  const secondary = traits[1] ?? primary;
  const bestMonths = destination.monthFit
    .map((score, index) => ({ score, month: index + 1 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(item => item.month);
  const crowd = destination.crowdLevel >= 4
    ? "Popular areas can feel busy in peak periods, so timing and a selective itinerary matter."
    : destination.crowdLevel <= 2
      ? "The destination can support a slower rhythm, especially outside its busiest dates."
      : "Crowds are usually manageable when dates and daily timing are chosen carefully.";
  const cost = destination.costTier >= 4
    ? "Accommodation needs earlier comparison to protect the total trip budget."
    : destination.costTier <= 2
      ? "There is room to keep the trip good-value without stripping away the experience."
      : "Total cost depends more on dates, transport and stay style than on the destination alone.";
  return {
    title: `${destination.nameEn} Greece Travel Guide: When to Go & Who It Fits`,
    description: `Plan a ${destination.nameEn}, Greece trip with season, trip length, budget, crowd level and traveller-fit guidance before choosing a stay.`,
    intro: `${destination.nameEn} is not the right Greece vacation for everyone. It becomes a strong choice when you want ${primary.promise} and ${secondary.promise}.`,
    primaryKeyword: `${destination.nameEn} Greece travel`,
    supportingKeywords: [
      `${destination.nameEn} Greece vacation`,
      `best time to visit ${destination.nameEn}`,
      `how many days in ${destination.nameEn}`,
      `${destination.nameEn} ${primary.query}`,
      `${destination.nameEn} with kids`,
      `${destination.nameEn} for couples`,
    ],
    labels: traits.slice(0, 5).map(item => item.label),
    bestMonths,
    crowd,
    cost,
    idealNights: `${destination.idealNightsMin}-${destination.idealNightsMax} nights`,
    effort: destination.effortAthens,
  };
}

export const greeceKeywordArchitectureV29 = {
  "el-GR": [
    { cluster: "Core", primary: "διακοπές στην Ελλάδα", intent: "broad planning", page: "/" },
    { cluster: "Discovery", primary: "προορισμοί στην Ελλάδα", intent: "destination discovery", page: "/proorismoi" },
    { cluster: "Islands", primary: "ελληνικά νησιά για διακοπές", intent: "island discovery", page: "/proorismoi" },
    { cluster: "Decision", primary: "πού να πάω διακοπές στην Ελλάδα", intent: "decision support", page: "/" },
    { cluster: "Value", primary: "οικονομικές διακοπές στην Ελλάδα", intent: "budget planning", page: "/proorismoi" },
    { cluster: "Family", primary: "οικογενειακές διακοπές Ελλάδα", intent: "family planning", page: "/proorismoi" },
    { cluster: "Season", primary: "διακοπές Σεπτέμβριο Ελλάδα", intent: "seasonal planning", page: "/proorismoi" },
  ],
  "en-GB": [
    { cluster: "Core", primary: "Greece travel", intent: "broad planning", page: "/en" },
    { cluster: "Vacation", primary: "Greece vacation", intent: "vacation planning", page: "/en" },
    { cluster: "Discovery", primary: "best places to visit in Greece", intent: "destination discovery", page: "/en/destinations" },
    { cluster: "Islands", primary: "Greek islands vacation", intent: "island discovery", page: "/en/destinations" },
    { cluster: "Planner", primary: "Greece trip planner", intent: "planning tool", page: "/en" },
    { cluster: "Family", primary: "Greece family vacation", intent: "family planning", page: "/en/destinations" },
    { cluster: "Season", primary: "Greece in September", intent: "seasonal planning", page: "/en/destinations" },
  ],
} as const;

export type SeoOpportunityRowV29 = {
  destination_id: string;
  query_key: string;
  primary_keyword: string;
  search_intent: string;
  opportunity_score: number;
  recommended_title: string;
  evidence: Record<string, unknown>;
  status: "draft";
  last_evaluated_at: string;
};

export function buildBilingualDestinationOpportunitiesV29(catalog: V8Destination[], currentMonth: number): SeoOpportunityRowV29[] {
  const now = new Date().toISOString();
  return catalog.filter(item => item.countryCode === "GR").flatMap(destination => {
    const el = destinationSeo(destination);
    const en = destinationSeoEn(destination);
    const seasonScore = destination.monthFit[currentMonth] ?? 50;
    const baseScore = Math.min(100, seasonScore * .5 + destination.routeConfidence * 25 + (6 - destination.costTier) * 3);
    const make = (locale: SeoLocaleV29, keywords: string[], title: string, page: string) => keywords.slice(0, 3).map((keyword, index) => ({
      destination_id: destination.slug,
      query_key: `${locale === "el-GR" ? "el" : "en"}:${index + 1}`,
      primary_keyword: keyword,
      search_intent: index === 0 ? "destination-vacation" : index === 1 ? "season-and-decision" : "trip-planning",
      opportunity_score: Math.round(Math.min(100, baseScore + (index === 0 ? 6 : 2)) * 100) / 100,
      recommended_title: index === 0 ? title : locale === "el-GR" ? `${keyword}: τι να ξέρεις πριν αποφασίσεις` : `${keyword}: what to know before you decide`,
      evidence: {
        locale,
        page,
        provenance: { demand: "editorial-seed-cluster", season: "first-party-destination-knowledge", recommendation: "calculated" },
        guardrails: ["no-auto-publish", "no-fabricated-search-volume", "no-scaled-duplicate-content", "human-review-before-indexing", "no-link-spam"],
      },
      status: "draft" as const,
      last_evaluated_at: now,
    }));
    return [
      ...make("el-GR", [el.primaryKeyword, ...el.supportingKeywords], el.title, `/proorismoi/${destination.slug}`),
      ...make("en-GB", [en.primaryKeyword, ...en.supportingKeywords], en.title, `/en/destinations/${destination.slug}`),
    ];
  });
}

export function buildSeoStrategyV29(catalog: V8Destination[]) {
  const greekDestinations = catalog.filter(item => item.countryCode === "GR");
  return {
    focus: "Greece travel decision intelligence",
    locales: ["el-GR", "en-GB"] as SeoLocaleV29[],
    destinationCount: greekDestinations.length,
    clusters: greeceKeywordArchitectureV29,
    internalLinkGraph: {
      el: ["/ -> /proorismoi", "/proorismoi -> /proorismoi/[slug]", "/proorismoi/[slug] -> related Greek destinations", "/proorismoi/[slug] -> /"],
      en: ["/en -> /en/destinations", "/en/destinations -> /en/destinations/[slug]", "/en/destinations/[slug] -> related Greek destinations", "/en/destinations/[slug] -> /en"],
      hreflang: "pair every Greek destination URL with its English equivalent",
    },
    linkEarningAssets: [
      { asset: "AI destination-fit methodology", targets: ["travel media", "tourism researchers", "travel-tech publications"], angle: "transparent destination decision methodology" },
      { asset: "Greek destination season/crowd comparison", targets: ["local tourism organizations", "regional publishers", "hospitality partners"], angle: "useful planning data with a citable methodology" },
      { asset: "Greece travel decision guides", targets: ["local chambers", "municipality tourism pages", "specialist travel blogs"], angle: "deep destination pages worth editorial citation" },
    ],
    backlinkPolicy: ["earned-editorial-links-only", "no-paid-dofollow-links", "no-automated-directory-spam", "nofollow-or-sponsored-for-paid-partnerships"],
    publishingPolicy: ["people-first", "first-party-evidence", "human-review-for-new-indexable-content", "avoid-query-variant-doorway-pages"],
  };
}

type SeoAiReviewV29 = {
  focusClusters: string[];
  contentGaps: string[];
  linkEarningIdeas: string[];
  risks: string[];
};

const asStrings = (value: unknown, max = 6) => Array.isArray(value) ? value.filter(item => typeof item === "string").slice(0, max) as string[] : [];

function validateSeoReviewV29(value: Record<string, unknown>): SeoAiReviewV29 | null {
  const review = {
    focusClusters: asStrings(value.focusClusters),
    contentGaps: asStrings(value.contentGaps),
    linkEarningIdeas: asStrings(value.linkEarningIdeas),
    risks: asStrings(value.risks),
  };
  return review.focusClusters.length && review.contentGaps.length ? review : null;
}

export async function reviewSeoStrategyWithAiV29(catalog: V8Destination[]) {
  const strategy = buildSeoStrategyV29(catalog);
  const budget = createLLMRequestBudgetV16();
  const result = await generateJsonWithRoutingV16<SeoAiReviewV29>({
    context: { task: "research", text: "Bilingual Greece travel SEO strategy with editorial link earning", deterministicConfidence: .55, hardConstraintRisk: true, forceSemantic: true },
    budget,
    preference: "critical",
    system: "You are the critical SEO strategy reviewer for a Greece-only travel decision platform. Work only from the supplied first-party strategy. Never invent search volume, rankings, backlinks, reviews, traffic or competitor facts. Never recommend paid dofollow links, automated backlinks, doorway pages, keyword stuffing or scaled low-value AI content. Prioritize people-first topical authority, bilingual architecture, internal links, citable assets and editorial outreach.",
    prompt: `Review this strategy and return JSON with exactly four string arrays: focusClusters, contentGaps, linkEarningIdeas, risks. Keep each array to 3-6 concise items. Strategy: ${JSON.stringify(strategy)}`,
    validate: validateSeoReviewV29,
  });
  return {
    review: result?.value ?? {
      focusClusters: ["διακοπές στην Ελλάδα", "Greece travel", "Greek islands vacation"],
      contentGaps: ["English destination hub coverage", "stronger cross-language destination pairs", "more first-party seasonal comparison assets"],
      linkEarningIdeas: ["publish a citable destination-fit methodology", "create seasonal Greece comparison resources", "earn citations from relevant local tourism publishers"],
      risks: ["new domain authority is still low", "rankings cannot be guaranteed", "avoid scaled AI pages and artificial backlinks"],
    },
    model: result ? `${result.tier}:${result.label}` : "deterministic-fallback",
    budget: budget.snapshot(),
  };
}
