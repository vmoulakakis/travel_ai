import { interpretIntentV8 } from "@/lib/ai/intent-v8";
import { verifyV8 } from "@/lib/ai/openai-verifier-v8";
import { auditAndRepairV10 } from "@/lib/ai/result-auditor-v10";
import { runTravelCouncilV9 } from "@/lib/ai/travel-council-v9";
import { fullContinuity, pendingContinuity, safePublicMessage } from "@/lib/continuity";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";
import { recordV8RecommendationSession } from "@/lib/data/match-learning-v8";
import { enrichV8Weather } from "@/lib/data/weather-v8";
import { screenResearchEvidence } from "@/lib/decision/research-intent-v13";
import { buildSmartDateWindows } from "@/lib/decision/date-windows-v9";
import { geographyConstraint } from "@/lib/decision/geography-constraint";
import { diversifyV8,finalRankV8,preRankV8,responseFeasibility,toRecommendationsV8,type V8Ranked } from "@/lib/decision/v8-matcher";
import type { V8RecommendationResponse } from "@/lib/decision/v8-types";
import { parseTripRequest, type TripRequest } from "@/lib/validation/trip";

export const runtime="nodejs";
export const dynamic="force-dynamic";
type Payload=Record<string,unknown>;

function repair(selected:V8Ranked[],pool:V8Ranked[],reject:string[]){if(!reject.length)return selected;const bad=new Set(reject);return diversifyV8(pool.filter(item=>!bad.has(item.destination.slug)),12)}
function profileSummary(trip:TripRequest){if(trip.language==="en"){const energy=trip.desiredEnergy==="restore"?"restoration":trip.desiredEnergy==="stimulating"?"energy and discovery":"balance";const social=trip.socialPreference==="quiet"?"a quiet rhythm":trip.socialPreference==="lively"?"lively energy":"a flexible social rhythm";return `${energy}, ${social}, ${trip.nights} nights, ${trip.groupSize} travellers`;}const energy=trip.desiredEnergy==="restore"?"αποφόρτιση":trip.desiredEnergy==="stimulating"?"ένταση και ανακάλυψη":"ισορροπία";const social=trip.socialPreference==="quiet"?"ήσυχο ρυθμό":trip.socialPreference==="lively"?"ζωντανή ενέργεια":"ευέλικτο κοινωνικό ρυθμό";return `${energy}, ${social}, ${trip.nights} νύχτες, ${trip.groupSize} ταξιδιώτες`;}

export async function POST(request:Request){
 const body=await request.json().catch(()=>null),parsed=parseTripRequest(body);if(!parsed.success)return Response.json({message:"Χρειάζομαι έγκυρες ημερομηνίες και βασικές προτιμήσεις για να συνεχίσω.",continuity:pendingContinuity()},{status:400});
 const trip=parsed.data,sessionId=crypto.randomUUID(),encoder=new TextEncoder();
 const stream=new ReadableStream<Uint8Array>({async start(controller){let closed=false;const emit=(type:string,progress:number,payload:Payload={})=>{if(!closed)controller.enqueue(encoder.encode(`${JSON.stringify({type,progress,at:new Date().toISOString(),...payload})}\n`))};
  try{
   emit("understand:start",8,{hasFreeText:Boolean(trip.tripText)});emit("catalog:start",12);
   const[intent,allDestinations]=await Promise.all([interpretIntentV8(trip),loadV8DestinationCatalog()]),catalog=allDestinations.filter(destination=>destination.countryCode==="GR");
   emit("understand:ready",24,{summary:intent.summary});emit("catalog:ready",36,{catalogSize:catalog.length});
   const hardConstraint=geographyConstraint(trip,catalog),pre=preRankV8(trip,intent,catalog,30),minimum=hardConstraint?1:3;if(pre.length<minimum){emit("continuity",100,{message:"",continuity:pendingContinuity()});return;}
   emit("shortlist:ready",52,{preview:pre.slice(0,7).map(x=>({destination:trip.language==="en"?x.destination.nameEn:x.destination.nameEl}))});
   emit("weather:start",60,{candidates:Math.min(18,pre.length)});
   const weather=await enrichV8Weather(trip,pre.map(x=>x.destination),18),weatherRanked=finalRankV8(trip,intent,pre,weather),research=await screenResearchEvidence(trip,weatherRanked,18),ranked=research.ranked,selected=diversifyV8(ranked,12);
   emit("weather:ready",80,{checked:weather.size,preview:selected.map(x=>({destination:trip.language==="en"?x.destination.nameEn:x.destination.nameEl}))});
   const selectedSlugs=new Set(selected.map(x=>x.destination.slug)),verificationPool=[...selected,...ranked.filter(x=>!selectedSlugs.has(x.destination.slug))].slice(0,18);
   emit("verify:start",86,{conditional:true});const verification=await verifyV8(trip,verificationPool),fixed=verification.checked&&!verification.passed?repair(selected,ranked,verification.rejectSlugs):selected;
   const audited=await auditAndRepairV10(trip,fixed,ranked,12,research.evidence);emit("verify:ready",91,{checked:true,corrected:audited.audit.attempts>1,confidence:audited.audit.confidence});if(!audited.audit.passed||!audited.items.length){emit("continuity",100,{message:trip.language==="en"?"There is not enough verified evidence for those criteria and dates yet.":"Δεν υπάρχουν ακόμη επαληθευμένα στοιχεία για αυτά τα κριτήρια και τις ημερομηνίες.",continuity:pendingContinuity()});return;}
   emit("council:start",93);
   const council=await runTravelCouncilV9(trip,audited.items),ordered=council.agreement==="STRONG"?[...audited.items].sort((a,b)=>a.destination.slug===council.finalSlug?-1:b.destination.slug===council.finalSlug?1:0):audited.items;
   const recommendations=toRecommendationsV8(trip,ordered).map(x=>({...x,dateWindows:buildSmartDateWindows(trip,x)}));
   emit("council:ready",97,{agreement:council.agreement});
   const publicIntent={...intent,source:"structured" as const,interpretedText:undefined};
   const result:V8RecommendationResponse={version:9,experienceVersion:9,request:trip,generatedAt:new Date().toISOString(),source:"verified-travel-knowledge",intent:publicIntent,catalogSize:catalog.length,eligibleCount:ranked.length,explorationCount:Math.max(0,recommendations.length-3),mode:"guided",resultCount:recommendations.length,profileSummary:profileSummary(trip),feasibility:responseFeasibility(ordered),council,continuity:fullContinuity(),recommendations};
   await recordV8RecommendationSession(sessionId,trip,intent,recommendations);emit("final",100,{result});
  }catch{emit("continuity",100,{message:safePublicMessage(null,trip.language==="en"?"en":"el"),continuity:pendingContinuity()})}finally{if(!closed){closed=true;controller.close()}}
 }});
 const secure=process.env.NODE_ENV==="production"?"; Secure":"";
 return new Response(stream,{headers:{"content-type":"application/x-ndjson; charset=utf-8","cache-control":"no-store, no-transform","x-content-type-options":"nosniff","set-cookie":`travel_match_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=7776000${secure}`}})
}
