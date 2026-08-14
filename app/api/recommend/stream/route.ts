import { interpretIntentV8 } from "@/lib/ai/intent-v8";
import { verifyV8 } from "@/lib/ai/openai-verifier-v8";
import { auditAndRepairV10 } from "@/lib/ai/result-auditor-v10";
import { applyResearchScoutRanking, runRecommendationResearchAgent } from "@/lib/ai/recommendation-research-agent-v14";
import { writeRecommendationAudit, writeRecommendationAuditError } from "@/lib/ai/recommendation-audit";
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
 const body=await request.json().catch(()=>null),parsed=parseTripRequest(body);
 if(!parsed.success)return Response.json({message:"Χρειάζομαι έγκυρες ημερομηνίες και βασικές προτιμήσεις για να συνεχίσω.",continuity:pendingContinuity()},{status:400});
 const trip=parsed.data,sessionId=crypto.randomUUID(),encoder=new TextEncoder(),started=Date.now(),timings:Record<string,number>={};
 let stage="start";
 const mark=(name:string)=>{timings[name]=Date.now()-started;stage=name};
 const stream=new ReadableStream<Uint8Array>({async start(controller){
  let closed=false;
  const emit=(type:string,progress:number,payload:Payload={})=>{if(!closed)controller.enqueue(encoder.encode(`${JSON.stringify({type,progress,at:new Date().toISOString(),...payload})}\n`))};
  try{
   emit("understand:start",8,{hasFreeText:Boolean(trip.tripText)});emit("catalog:start",12);
   stage="intent+catalog";
   const[intent,allDestinations]=await Promise.all([interpretIntentV8(trip),loadV8DestinationCatalog()]),catalog=allDestinations.filter(destination=>destination.countryCode==="GR");
   mark("intent+catalog");
   emit("understand:ready",24,{summary:intent.summary});emit("catalog:ready",36,{catalogSize:catalog.length});
   const hardConstraint=geographyConstraint(trip,catalog),pre=preRankV8(trip,intent,catalog,30),minimum=hardConstraint?1:3;
   mark("pre-rank");
   if(pre.length<minimum){
    writeRecommendationAudit({sessionId,status:"no-result",stage:"pre-rank",timingsMs:timings,intentSource:intent.source,hardConstraint:hardConstraint?.id??null,catalogSize:catalog.length,preCandidates:pre.map(item=>item.destination.slug)});
    emit("continuity",100,{message:trip.language==="en"?"No available destination satisfies that combination yet.":"Δεν υπάρχουν διαθέσιμες επιλογές για αυτόν τον συνδυασμό.",continuity:pendingContinuity()});return;
   }
   emit("shortlist:ready",50,{preview:pre.slice(0,7).map(x=>({destination:trip.language==="en"?x.destination.nameEn:x.destination.nameEl}))});

   emit("weather:start",56,{candidates:Math.min(18,pre.length)});
   stage="weather";
   const weather=await enrichV8Weather(trip,pre.map(x=>x.destination),18),weatherRanked=finalRankV8(trip,intent,pre,weather);
   mark("weather");
   emit("weather:ready",70,{checked:weather.size});

   stage="stored-evidence";
   const research=await screenResearchEvidence(trip,weatherRanked,18);
   mark("stored-evidence");
   emit("research:start",74,{webBacked:true});
   stage="research-scout";
   const researchScout=await runRecommendationResearchAgent(trip,research.ranked),ranked=applyResearchScoutRanking(research.ranked,researchScout);
   mark("research-scout");
   emit("research:ready",84,{webBacked:researchScout.ran,checked:researchScout.inspectedSlugs.length,confidence:researchScout.confidence});

   const selected=diversifyV8(ranked,12),selectedSlugs=new Set(selected.map(x=>x.destination.slug)),verificationPool=[...selected,...ranked.filter(x=>!selectedSlugs.has(x.destination.slug))].slice(0,18);
   emit("verify:start",87,{conditional:true});
   stage="verifier";
   const verification=await verifyV8(trip,verificationPool),fixed=verification.checked&&!verification.passed?repair(selected,ranked,verification.rejectSlugs):selected;
   mark("verifier");
   stage="auditor";
   const audited=await auditAndRepairV10(trip,fixed,ranked,12,research.evidence);
   mark("auditor");
   emit("verify:ready",91,{checked:true,corrected:audited.audit.attempts>1,confidence:audited.audit.confidence});
   if(!audited.audit.passed||!audited.items.length){
    writeRecommendationAudit({
     sessionId,status:"no-result",stage:"auditor",timingsMs:timings,intentSource:intent.source,hardConstraint:hardConstraint?.id??null,catalogSize:catalog.length,preCandidates:pre.slice(0,8).map(item=>item.destination.slug),
     researchScout:{ran:researchScout.ran,source:researchScout.source,inspectedSlugs:researchScout.inspectedSlugs,preferredSlugs:researchScout.preferredSlugs,rejectSlugs:researchScout.rejectSlugs,confidence:researchScout.confidence,evidenceDomains:researchScout.evidenceDomains},
     verifier:{checked:verification.checked,passed:verification.passed,rejectSlugs:verification.rejectSlugs},
     auditor:{passed:audited.audit.passed,confidence:audited.audit.confidence,attempts:audited.audit.attempts,issues:audited.audit.issues.map(issue=>({slug:issue.slug,code:issue.code}))},
    });
    emit("continuity",100,{message:trip.language==="en"?"There is not enough verified evidence for those criteria and dates yet.":"Δεν υπάρχουν ακόμη επαληθευμένα στοιχεία για αυτά τα κριτήρια και τις ημερομηνίες.",continuity:pendingContinuity()});return;
   }

   emit("council:start",93);
   stage="council";
   const council=await runTravelCouncilV9(trip,audited.items),ordered=council.agreement==="STRONG"?[...audited.items].sort((a,b)=>a.destination.slug===council.finalSlug?-1:b.destination.slug===council.finalSlug?1:0):audited.items;
   mark("council");
   const recommendations=toRecommendationsV8(trip,ordered).map(x=>({...x,dateWindows:buildSmartDateWindows(trip,x)}));
   emit("council:ready",97,{agreement:council.agreement});
   const publicIntent={...intent,source:"structured" as const,interpretedText:undefined};
   const result:V8RecommendationResponse={version:9,experienceVersion:9,request:trip,generatedAt:new Date().toISOString(),source:"verified-travel-knowledge",intent:publicIntent,catalogSize:catalog.length,eligibleCount:ranked.length,explorationCount:Math.max(0,recommendations.length-3),mode:"guided",resultCount:recommendations.length,profileSummary:profileSummary(trip),feasibility:responseFeasibility(ordered),council,continuity:fullContinuity(),recommendations};

   stage="learning";
   await recordV8RecommendationSession(sessionId,trip,intent,recommendations);
   mark("learning");
   writeRecommendationAudit({
    sessionId,status:"success",stage:"final",timingsMs:{...timings,total:Date.now()-started},intentSource:intent.source,hardConstraint:hardConstraint?.id??null,catalogSize:catalog.length,preCandidates:pre.slice(0,8).map(item=>item.destination.slug),
    researchScout:{ran:researchScout.ran,source:researchScout.source,inspectedSlugs:researchScout.inspectedSlugs,preferredSlugs:researchScout.preferredSlugs,rejectSlugs:researchScout.rejectSlugs,confidence:researchScout.confidence,evidenceDomains:researchScout.evidenceDomains},
    verifier:{checked:verification.checked,passed:verification.passed,rejectSlugs:verification.rejectSlugs},
    auditor:{passed:audited.audit.passed,confidence:audited.audit.confidence,attempts:audited.audit.attempts,checkedBy:audited.audit.checkedBy},
    council:{agreement:council.agreement,finalSlug:council.finalSlug,voices:council.voices.map(voice=>({role:voice.role,source:voice.source,pickSlug:voice.pickSlug,confidence:voice.confidence}))},
    finalSlugs:recommendations.slice(0,6).map(item=>item.slug),
   });
   emit("final",100,{result});
  }catch(error){
   writeRecommendationAuditError(sessionId,stage,error,{...timings,total:Date.now()-started});
   emit("continuity",100,{message:safePublicMessage(null,trip.language==="en"?"en":"el"),continuity:pendingContinuity()});
  }finally{if(!closed){closed=true;controller.close()}}
 }});
 const secure=process.env.NODE_ENV==="production"?"; Secure":"";
 return new Response(stream,{headers:{"content-type":"application/x-ndjson; charset=utf-8","cache-control":"no-store, no-transform","x-content-type-options":"nosniff","set-cookie":`travel_match_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=7776000${secure}`}});
}
