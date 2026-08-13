import assert from "node:assert/strict";
import { auditAndRepairV10 } from "../lib/ai/result-auditor-v10";
import type { V8Ranked } from "../lib/decision/v8-matcher";
import type { V8Destination } from "../lib/decision/v8-types";
import type { TripRequest } from "../lib/validation/trip";
import { researchIntent, satisfiesResearchNeed } from "../lib/decision/research-intent-v13";
import type { DestinationEvidenceBundle } from "../lib/decision/types";
const destination=(slug:string,profile:string):V8Destination=>({slug,nameEl:slug,nameEn:slug,countryCode:"GR",countryEl:"Ελλάδα",countryEn:"Greece",latitude:1,longitude:1,regionGroup:"test",aliases:[slug],tags:["nature"],vector:Array(16).fill(.5),monthFit:Array(12).fill(80),idealNightsMin:2,idealNightsMax:5,costTier:2,effortAthens:"road-near",effortThessaloniki:"road-near",directFromAthens:false,routeConfidence:.9,travelerFit:{},crowdLevel:2,hotelRadiusKm:20,knowledgeSource:"test",seasonProfile:profile});
const ranked=(slug:string,profile:string):V8Ranked=>({destination:destination(slug,profile),score:80,preScore:80,breakdown:{intent:80,season:80,effort:80,duration:80,budget:80,weather:80,traveler:80,crowdFit:80,routeConfidence:90},weather:null});
const request={origin:"Athens",startDate:"2026-10-10",endDate:"2026-10-13",month:"october",nights:3,budget:800,moods:["nature"],travelerType:"couple",language:"el",distancePreference:"any",pace:"balanced",hotelStyle:"any",avoid:"none",groupSize:2,desiredEnergy:"restore",socialPreference:"quiet",noveltyPreference:"balanced",mustHave:"nature",dateFlexibility:"open",transportMode:"car",stayLocationPreference:"balanced",tripText:"ΘΕΛΩ ΜΟΝΟ ΒΟΥΝΟ"} satisfies TripRequest;
async function main(){const island=ranked("naxos","summer_island"),mountain=ranked("karpenisi","mountain"),result=await auditAndRepairV10(request,[island,mountain],[island,mountain],12);assert(result.audit.passed&&result.audit.confidence==="HIGH","Audit must reach a high-confidence valid result");assert.deepEqual(result.items.map(item=>item.destination.slug),["karpenisi"],"Audit must remove an island from a mountain-only request");assert.equal(result.audit.attempts,2,"Audit must repair and rerun once");
 const researchRequest={...request,mustHave:"culture",moods:["culture"],tripText:"Θέλω το μέρος να έχει αρχαία και εκδηλώσεις"} satisfies TripRequest;
 const intent=researchIntent(researchRequest);assert.deepEqual([...intent.needs].sort(),["ancient_history","dated_events"],"Ancient sites and dated events must remain distinct research needs");
 const empty:DestinationEvidenceBundle={destinationId:"karpenisi",checkedAt:new Date().toISOString(),tripadvisor:[],booking:[],events:[],places:[],seasonal:[],hasCurrentRanking:false,hasDateMatchedEvents:false};
 assert.equal(satisfiesResearchNeed(empty,"ancient_history"),false);assert.equal(satisfiesResearchNeed(empty,"dated_events"),false);
 const rejected=await auditAndRepairV10(researchRequest,[mountain],[mountain],12,new Map([["karpenisi",empty]]));assert.equal(rejected.audit.passed,false,"Research audit must never invent missing ancient/event evidence");assert(rejected.audit.issues.some(issue=>issue.code==="RESEARCH_EVIDENCE"));
 console.log("RESULT_AUDITOR_OK",JSON.stringify(result.audit));}
void main();
