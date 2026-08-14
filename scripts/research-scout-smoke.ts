import assert from "node:assert/strict";
import { applyResearchScoutRanking, type ResearchScoutResult } from "@/lib/ai/recommendation-research-agent-v14";
import type { V8Ranked } from "@/lib/decision/v8-matcher";
import type { V8Destination } from "@/lib/decision/v8-types";

function ranked(slug:string,score:number):V8Ranked{
 const destination={slug,nameEl:slug,nameEn:slug,countryCode:"GR",countryEl:"Ελλάδα",countryEn:"Greece",latitude:38,longitude:22,regionGroup:"test",aliases:[],tags:["nature"],vector:[],monthFit:Array(12).fill(70),idealNightsMin:2,idealNightsMax:5,costTier:2,effortAthens:"road-medium",effortThessaloniki:"road-medium",directFromAthens:false,routeConfidence:.9,travelerFit:{},crowdLevel:2,hotelRadiusKm:20,knowledgeSource:"test",seasonProfile:"all-year"} as V8Destination;
 return{destination,score,preScore:score,breakdown:{intent:70,season:70,effort:70,duration:70,budget:70,weather:70,traveler:70,crowdFit:70,routeConfidence:90}};
}
const input=[ranked("alpha",70),ranked("beta",69),ranked("gamma",68)];
const result:ResearchScoutResult={ran:true,source:"agent",inspectedSlugs:["alpha","beta"],preferredSlugs:["alpha","invented"],rejectSlugs:["beta","invented"],confidence:"HIGH",summary:"test",evidenceDomains:["en.wikivoyage.org"]};
const output=applyResearchScoutRanking(input,result);
const bySlug=new Map(output.map(item=>[item.destination.slug,item.score]));
assert.equal(bySlug.get("alpha"),77);
assert.equal(bySlug.get("beta"),61);
assert.equal(bySlug.get("gamma"),68);
assert.equal(output[0].destination.slug,"alpha");

const skipped:ResearchScoutResult={...result,ran:false,source:"not-needed"};
assert.deepEqual(applyResearchScoutRanking(input,skipped),input);
console.log("research scout smoke: ok");
