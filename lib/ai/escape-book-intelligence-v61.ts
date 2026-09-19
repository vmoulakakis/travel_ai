import { createLLMRequestBudgetV16,generateJsonWithRoutingV16 } from "@/lib/ai/model-router-v9";
import type { LocalIntelligenceV38,LocalPlaceV38 } from "@/lib/data/local-intelligence-v38";
import type { DestinationInsightsResponse } from "@/lib/decision/types";
import type { TripRequest } from "@/lib/validation/trip";

export type EscapeBookPickV61={
 id:string;name:string;kind:LocalPlaceV38["kind"];source:LocalPlaceV38["source"];rating:number|null;ratingCount:number|null;ranking:number|null;
 address:string|null;url:string|null;imageUrl:string|null;distanceKm:number|null;why:string;practical:string;trust:string;internalSignal:number|null;
};
export type EscapeBookIntelligenceV61={
 version:"V61";generatedAt:string;mode:"agentic-rag"|"deterministic-evidence";overview:string;
 dontMiss:EscapeBookPickV61[];restaurants:EscapeBookPickV61[];nightlife:EscapeBookPickV61[];nearby:EscapeBookPickV61[];
 sourceLedger:string[];evidenceQuality:{trustedProviderCount:number;trustedProviders:string[];missingTrustedProviders:string[];canUseBestLanguage:boolean};learning:{enabled:boolean;note:string};
};

const norm=(v:string)=>v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9α-ω]+/gi," ").replace(/\s+/g," ").trim();
const clean=(v:unknown,max=260)=>typeof v==="string"?v.trim().replace(/\s+/g," ").slice(0,max):"";
const dist=(v:number|null)=>v==null?"distance not available":v<1?Math.max(1,Math.round(v*1000))+" m from stay":v.toFixed(v<10?1:0)+" km from stay";
function trust(p:LocalPlaceV38){
 const reviews=Math.max(0,p.ratingCount??0);
 if(p.source==="Tripadvisor"&&p.rating!=null)return "Tripadvisor "+p.rating.toFixed(1)+"/5"+(reviews?" · "+reviews.toLocaleString()+" reviews":"");
 if(p.source==="Google Places"&&p.rating!=null)return "Google "+p.rating.toFixed(1)+"/5"+(reviews?" · "+reviews.toLocaleString()+" reviews":"");
 if(p.source==="Foursquare"&&p.rating!=null)return "Foursquare "+p.rating.toFixed(1)+"/5";
 return p.source;
}
function fallbackWhy(p:LocalPlaceV38,trip:TripRequest,research:DestinationInsightsResponse){
 const direct=[...research.attractions,...research.restaurants].find(x=>norm(x.name)===norm(p.name));
 if(direct?.whyItFits)return clean(direct.whyItFits,190);
 if(direct?.summary)return clean(direct.summary,190);
 const mood=trip.moods[0]??"relax";
 const category=p.kind==="restaurant"?"food":p.kind==="nightlife"?"evening":p.kind==="museum"?"culture":p.kind==="beach"?"sea":"local character";
 const distance=p.distanceKm!=null&&p.distanceKm<=2?"easy to reach from your stay":"worth considering in the wider area";
 return category+" fit for a "+mood+" trip; "+distance+".";
}
function practical(p:LocalPlaceV38){
 if(p.distanceKm!=null&&p.distanceKm<=1)return"Very low-friction stop from the selected stay.";
 if(p.distanceKm!=null&&p.distanceKm<=5)return"Easy nearby visit; combine with another stop in the same area.";
 if(p.distanceKm!=null)return"Plan it as a deliberate outing rather than a quick walk-in stop.";
 if(p.ranking!=null)return"Provider-ranked pick #"+p.ranking+"; confirm current hours before going.";
 return"Confirm current opening hours and access before going.";
}
function score(p:LocalPlaceV38){
 const provider=p.source==="Tripadvisor"?16:p.source==="Google Places"?14:p.source==="Foursquare"?10:3;
 const rating=p.rating==null?0:p.rating*12;
 const count=Math.min(18,Math.log10((p.ratingCount??0)+1)*5);
 const internal=(p.internalSignal?.aiScore??0)*.12;
 const near=p.distanceKm==null?0:Math.max(0,14-Math.min(14,p.distanceKm));
 const rank=p.ranking==null?0:Math.max(0,8-p.ranking);
 return provider+rating+count+internal+near+rank;
}
function unique(rows:LocalPlaceV38[]){
 const seen=new Set<string>();return rows.filter(p=>{const k=p.kind+":"+norm(p.name);if(seen.has(k))return false;seen.add(k);return true});
}
function toPick(p:LocalPlaceV38,trip:TripRequest,research:DestinationInsightsResponse,why?:string,note?:string):EscapeBookPickV61{
 return{id:p.id,name:p.name,kind:p.kind,source:p.source,rating:p.rating,ratingCount:p.ratingCount,ranking:p.ranking,address:p.address,url:p.url,imageUrl:p.imageUrl,distanceKm:p.distanceKm,
  why:clean(why,220)||fallbackWhy(p,trip,research),practical:clean(note,160)||practical(p),trust:trust(p),internalSignal:p.internalSignal?.sampleSize&&p.internalSignal.sampleSize>=3?p.internalSignal.aiScore:null};
}
function ranked(rows:LocalPlaceV38[]){return[...rows].sort((a,b)=>score(b)-score(a))}
type Choice={id:string;why:string;practical:string};
type AiOut={overview:string;sections:{dont_miss:Choice[];restaurants:Choice[];nightlife:Choice[];nearby:Choice[]}};

export async function buildEscapeBookIntelligenceV61(args:{local:LocalIntelligenceV38;research:DestinationInsightsResponse;trip:TripRequest;destination:string;stayName:string}):Promise<EscapeBookIntelligenceV61>{
 const all=unique([...args.local.attractions,...args.local.museums,...args.local.beaches,...args.local.restaurants,...args.local.nightlife,...args.local.cafes]);
 const byId=new Map(all.map(x=>[x.id,x]));
 const fallback={
  dontMiss:ranked(all.filter(x=>["attraction","museum","beach"].includes(x.kind))).slice(0,4),
  restaurants:ranked(all.filter(x=>x.kind==="restaurant"||x.kind==="cafe")).slice(0,4),
  nightlife:ranked(all.filter(x=>x.kind==="nightlife")).slice(0,3),
  nearby:[...all].filter(x=>x.distanceKm!=null).sort((a,b)=>(a.distanceKm??999)-(b.distanceKm??999)).slice(0,5)
 };
 const trustedNames=["Tripadvisor","Google Places","Foursquare"],trustedProviders=trustedNames.filter(x=>args.local.providers.includes(x)),missingTrustedProviders=trustedNames.filter(x=>!args.local.providers.includes(x));
 const base:EscapeBookIntelligenceV61={version:"V61",generatedAt:new Date().toISOString(),mode:"deterministic-evidence",
  overview:args.research.overview??("Evidence-led guide for "+args.destination+", centered on "+args.stayName+"."),
  dontMiss:fallback.dontMiss.map(x=>toPick(x,args.trip,args.research)),restaurants:fallback.restaurants.map(x=>toPick(x,args.trip,args.research)),
  nightlife:fallback.nightlife.map(x=>toPick(x,args.trip,args.research)),nearby:fallback.nearby.map(x=>toPick(x,args.trip,args.research)),
  sourceLedger:[...new Set([...args.local.providers,...args.research.sources.map(x=>x.domain)])],
  evidenceQuality:{trustedProviderCount:trustedProviders.length,trustedProviders,missingTrustedProviders,canUseBestLanguage:trustedProviders.length>0},
  learning:{enabled:Boolean(args.local.destinationSignal?.sampleSize&&args.local.destinationSignal.sampleSize>=3),note:"Post-trip first-party feedback can influence ranking only after the minimum sample threshold is met; provider facts remain provider-sourced."}};
 if(all.length<2)return base;
 const candidates=all.slice(0,36).map(p=>({id:p.id,name:p.name,kind:p.kind,source:p.source,rating:p.rating,reviewCount:p.ratingCount,providerRank:p.ranking,distanceKm:p.distanceKm,distanceLabel:dist(p.distanceKm),guestSignal:p.internalSignal?.sampleSize&&p.internalSignal.sampleSize>=3?p.internalSignal.aiScore:null,address:p.address}));
 const researchNotes={overview:args.research.overview,places:[...args.research.attractions,...args.research.restaurants].map(x=>({name:x.name,summary:x.summary,why:x.whyItFits,strength:x.evidenceStrength})).slice(0,12),practical:args.research.practicalNotes};
 const prompt=JSON.stringify({destination:args.destination,stay:args.stayName,trip:{dates:[args.trip.startDate,args.trip.endDate],traveler:args.trip.travelerType,moods:args.trip.moods,pace:args.trip.pace,budget:args.trip.budget},candidates,research:researchNotes});
 const routed=await generateJsonWithRoutingV16<AiOut>({context:{task:"research",text:prompt,deterministicConfidence:.74,hardConstraintRisk:true,forceSemantic:true,preferOpenAI:true},budget:createLLMRequestBudgetV16(),preference:"critical",
  system:"You are the evidence-selection agent for a travel dossier. Use ONLY supplied candidate IDs and supplied research. Never invent a business, attraction, rating, review count, distance, opening hour, price, ranking or source. Select useful items for the exact traveler and stay. Return concise text matching the trip language. JSON only: {overview,sections:{dont_miss:[{id,why,practical}],restaurants:[...],nightlife:[...],nearby:[...]}}. Limits: 4,4,3,5.",
  prompt,validate(v){
   const overview=clean(v.overview,380);const raw=v.sections;if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
   const sec=raw as Record<string,unknown>;
   const read=(key:string,max:number)=>Array.isArray(sec[key])?(sec[key] as unknown[]).flatMap(item=>{if(!item||typeof item!=="object"||Array.isArray(item))return[];const r=item as Record<string,unknown>,id=clean(r.id,180);if(!byId.has(id))return[];return[{id,why:clean(r.why,220),practical:clean(r.practical,160)}]}).slice(0,max):[];
   return{overview:overview||base.overview,sections:{dont_miss:read("dont_miss",4),restaurants:read("restaurants",4),nightlife:read("nightlife",3),nearby:read("nearby",5)}};
  }});
 if(!routed)return base;
 const convert=(rows:Choice[],fallbackRows:LocalPlaceV38[],limit:number)=>{
  const picks=rows.flatMap(r=>{const p=byId.get(r.id);return p?[toPick(p,args.trip,args.research,r.why,r.practical)]:[]});
  const used=new Set(picks.map(x=>x.id));for(const p of fallbackRows)if(picks.length<limit&&!used.has(p.id)){picks.push(toPick(p,args.trip,args.research));used.add(p.id)}return picks.slice(0,limit);
 };
 return{...base,mode:"agentic-rag",overview:routed.value.overview,
  dontMiss:convert(routed.value.sections.dont_miss,fallback.dontMiss,4),restaurants:convert(routed.value.sections.restaurants,fallback.restaurants,4),
  nightlife:convert(routed.value.sections.nightlife,fallback.nightlife,3),nearby:convert(routed.value.sections.nearby,fallback.nearby,5)};
}
