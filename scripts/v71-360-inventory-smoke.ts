import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { seasonalStayFit } from "../lib/decision/stay-seasonality-v66";

const api=readFileSync("app/api/v50/map-stays/route.ts","utf8");
const ui=readFileSync("components/v54-final-home.tsx","utf8");

for(const [description,token] of [
 ["full-pool pagination","const rows:OfferRow[]=[],rowCeiling=3000"],
 ["travel-date validity check","validTo.slice(0,10)<travelDate"],
 ["exact affiliate tracking format","go\\.linkwi\\.se"],
 ["unknown stock tracking","coverage.unknownAvailability++"],
 ["reject proven out of stock","row.in_stock===false"],
 ["first-party evidence contribution","evidenceByPlace.get(p.placeId)"],
 ["coverage reporting","knowledgeCoveragePct"],
 ["server-side Top 100 sort","enriched.sort((a,b)=>b.intelligenceScore"]
] as const)assert.ok(api.includes(token),description);
assert.ok(ui.includes('slice(0,100).map((p,i)'),"home supports Top 100");

const corfuOctoberResort=seasonalStayFit({month:10,propertyName:"Beach Resort with Outdoor Pool",destinationSlug:"corfu",destinationSeasonProfile:"summer_island",destinationTags:["beach"]});
const corfuOctoberTown=seasonalStayFit({month:10,propertyName:"Traditional Boutique Apartment Old Town",destinationSlug:"corfu",destinationSeasonProfile:"summer_island",destinationTags:["culture","city"]});
assert.ok(corfuOctoberTown.score>corfuOctoberResort.score,"October Corfu town stay should outrank summer resort by season, without forbidding Corfu");
const mountainAutumn=seasonalStayFit({month:10,propertyName:"Traditional Mountain Guesthouse Spa Forest",destinationSlug:"metsovo",destinationSeasonProfile:"mountain",destinationTags:["nature"]});
assert.ok(mountainAutumn.score>corfuOctoberResort.score,"Autumn nature stay should be competitive against off-season resort");

console.log("V71_360_INVENTORY_SMOKE_OK",JSON.stringify({corfuOctoberTown:corfuOctoberTown.score,corfuOctoberResort:corfuOctoberResort.score,mountainAutumn:mountainAutumn.score}));
