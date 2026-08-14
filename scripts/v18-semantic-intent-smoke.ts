import assert from "node:assert/strict";
import { deterministicSemanticIntentV18 } from "../lib/ai/intent-v8";
import { applySemanticIntentRankingV18 } from "../lib/decision/semantic-intent-ranking-v18";
import { V8_DIMENSIONS,type V8Dimension,type V8IntentProfile,type V8Destination } from "../lib/decision/v8-types";
import type { V8Ranked } from "../lib/decision/v8-matcher";

const idx=Object.fromEntries(V8_DIMENSIONS.map((d,i)=>[d,i])) as Record<V8Dimension,number>;
function vector(values:Partial<Record<V8Dimension,number>>){const v=V8_DIMENSIONS.map(()=>.1);for(const [k,n] of Object.entries(values))v[idx[k as V8Dimension]]=n??.1;return v;}
function ranked(slug:string,values:Partial<Record<V8Dimension,number>>,crowd:1|2|3|4|5,effort:number,tags:V8Dimension[]):V8Ranked{
 const destination={slug,nameEl:slug,nameEn:slug,countryCode:"GR",countryEl:"Ελλάδα",countryEn:"Greece",latitude:0,longitude:0,regionGroup:slug,aliases:[],tags,vector:vector(values),monthFit:Array(12).fill(80),idealNightsMin:2,idealNightsMax:5,costTier:2,effortAthens:"road-near",effortThessaloniki:"road-near",directFromAthens:true,routeConfidence:.9,travelerFit:{},crowdLevel:crowd,hotelRadiusKm:5,knowledgeSource:"test",seasonProfile:"test"} satisfies V8Destination;
 return{destination,score:80,preScore:80,breakdown:{intent:80,season:80,effort,duration:80,budget:80,weather:80,traveler:80,crowdFit:80,routeConfidence:90}};
}

const foodNoNight=deterministicSemanticIntentV18("Θέλω πολύ καλό φαγητό αλλά όχι nightlife και όχι πολύ κόσμο");
assert.ok((foodNoNight.positive.food??0)>=.8,"food should be strongly positive");
assert.ok((foodNoNight.negative.nightlife??0)>=.9,"nightlife negation must stay negative");
assert.ok(foodNoNight.qualifiers.avoidCrowds>=.9,"crowd avoidance should be explicit");

const cultureFirst=deterministicSemanticIntentV18("culture first, sea nearby but this is not a beach holiday");
assert.equal(cultureFirst.priorities[0],"culture","culture first must become priority");
assert.ok((cultureFirst.negative.beach??0)>=.7,"not a beach holiday must not become a beach-positive request");

const easySlow=deterministicSemanticIntentV18("Θέλω ήρεμο ρυθμό, χωρίς τρέξιμο και εύκολη πρόσβαση, ιδανικά με τα πόδια");
assert.ok(easySlow.qualifiers.slowRhythm>=.9,"slow rhythm should be extracted");
assert.ok(easySlow.qualifiers.easyAccess>=.9,"easy access should be extracted");
assert.ok(easySlow.qualifiers.walkable>=.9,"walkability should be extracted");

const semantic=foodNoNight;
const intent:V8IntentProfile={weights:Object.fromEntries(V8_DIMENSIONS.map(d=>[d,.2])) as Record<V8Dimension,number>,source:"structured",summary:"test",semantic};
const quietFood=ranked("quiet-food",{food:.95,nightlife:.1,culture:.7},2,90,["food","culture","relax"]);
const partyFood=ranked("party-food",{food:.95,nightlife:.95,city:.9},5,82,["food","nightlife","city"]);
const ordered=applySemanticIntentRankingV18([partyFood,quietFood],intent);
assert.equal(ordered[0].destination.slug,"quiet-food","negative nightlife + crowd avoidance must beat a party-heavy alternative");

console.log("V18_SEMANTIC_INTENT_OK",{negativeNightlife:foodNoNight.negative.nightlife,avoidCrowds:foodNoNight.qualifiers.avoidCrowds,culturePriority:cultureFirst.priorities[0],winner:ordered[0].destination.slug});
