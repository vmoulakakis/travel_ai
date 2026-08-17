import assert from "node:assert/strict";
import type { V8Destination } from "@/lib/decision/v8-types";
import { buildBilingualDestinationOpportunitiesV29, buildSeoStrategyV29, destinationSeoEn, greeceKeywordArchitectureV29 } from "@/lib/seo/greece-seo-v29";

const destination: V8Destination = {
  slug: "naxos",
  nameEl: "Νάξος",
  nameEn: "Naxos",
  countryCode: "GR",
  countryEl: "Ελλάδα",
  countryEn: "Greece",
  latitude: 37.1036,
  longitude: 25.3777,
  regionGroup: "cyclades",
  aliases: ["Naxos"],
  tags: ["beach", "family", "food", "value"],
  vector: [],
  monthFit: [35, 35, 45, 60, 75, 92, 95, 95, 92, 70, 50, 40],
  idealNightsMin: 4,
  idealNightsMax: 7,
  costTier: 3,
  effortAthens: "medium",
  effortThessaloniki: "medium",
  directFromAthens: true,
  routeConfidence: .92,
  travelerFit: {},
  crowdLevel: 3,
  hotelRadiusKm: 20,
  knowledgeSource: "test",
  seasonProfile: "summer-shoulder",
};

const english = destinationSeoEn(destination);
assert.match(english.title, /Naxos Greece Travel Guide/);
assert.equal(english.primaryKeyword, "Naxos Greece travel");
assert.ok(english.supportingKeywords.some(keyword => keyword.includes("vacation")));

const opportunities = buildBilingualDestinationOpportunitiesV29([destination], 8);
assert.equal(opportunities.length, 6);
assert.equal(new Set(opportunities.map(item => item.query_key)).size, 6);
assert.ok(opportunities.some(item => item.evidence.locale === "el-GR"));
assert.ok(opportunities.some(item => item.evidence.locale === "en-GB"));
assert.ok(opportunities.every(item => item.opportunity_score >= 0 && item.opportunity_score <= 100));

const strategy = buildSeoStrategyV29([destination]);
assert.equal(strategy.destinationCount, 1);
assert.ok(strategy.backlinkPolicy.includes("earned-editorial-links-only"));
assert.ok(strategy.publishingPolicy.includes("people-first"));
assert.ok(greeceKeywordArchitectureV29["el-GR"].some(item => item.primary === "διακοπές στην Ελλάδα"));
assert.ok(greeceKeywordArchitectureV29["en-GB"].some(item => item.primary === "Greece travel"));

console.log("V29 bilingual SEO agent smoke: OK");
