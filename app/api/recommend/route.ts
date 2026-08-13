import { NextResponse } from "next/server";
import { interpretIntentV8 } from "@/lib/ai/intent-v8";
import { verifyV8 } from "@/lib/ai/openai-verifier-v8";
import { auditAndRepairV10 } from "@/lib/ai/result-auditor-v10";
import { runTravelCouncilV9 } from "@/lib/ai/travel-council-v9";
import { fullContinuity, pendingContinuity } from "@/lib/continuity";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";
import { recordV8RecommendationSession } from "@/lib/data/match-learning-v8";
import { enrichV8Weather } from "@/lib/data/weather-v8";
import { buildSmartDateWindows } from "@/lib/decision/date-windows-v9";
import { geographyConstraint } from "@/lib/decision/geography-constraint";
import { diversifyV8,finalRankV8,preRankV8,responseFeasibility,toRecommendationsV8,type V8Ranked } from "@/lib/decision/v8-matcher";
import type { V8RecommendationResponse } from "@/lib/decision/v8-types";
import { parseTripRequest, type TripRequest } from "@/lib/validation/trip";

export const runtime="nodejs";export const dynamic="force-dynamic";
function repair(selected:V8Ranked[],pool:V8Ranked[],reject:string[]){if(!reject.length)return selected;const bad=new Set(reject);return diversifyV8(pool.filter(item=>!bad.has(item.destination.slug)),12)}
function profileSummary(trip:TripRequest){if(trip.language==="en"){const energy=trip.desiredEnergy==="restore"?"restoration":trip.desiredEnergy==="stimulating"?"energy and discovery":"balance";const social=trip.socialPreference==="quiet"?"a quiet rhythm":trip.socialPreference==="lively"?"lively energy":"a flexible social rhythm";return `${energy}, ${social}, ${trip.nights} nights, ${trip.groupSize} travellers`;}const energy=trip.desiredEnergy==="restore"?"αποφόρτιση":trip.desiredEnergy==="stimulating"?"ένταση και ανακάλυψη":"ισορροπία";const social=trip.socialPreference==="quiet"?"ήσυχο ρυθμό":trip.socialPreference==="lively"?"ζωντανή ενέργεια":"ευέλικτο κοινωνικό ρυθμό";return `${energy}, ${social}, ${trip.nights} νύχτες, ${trip.groupSize} ταξιδιώτες`;}

export async function POST(request:Request){
 const body=await request.json().catch(()=>null),parsed=parseTripRequest(body);if(!parsed.success)return NextResponse.json({message:"Χρειάζομαι έγκυρες ημερομηνίες και βασικές προτιμήσεις για να συνεχίσω.",continuity:pendingContinuity()},{status:400});
 const trip=parsed.data,sessionId=crypto.randomUUID();
 try{
  const[intent,allDestinations]=await Promise.all([interpretIntentV8(trip),loadV8DestinationCatalog()]),catalog=allDestinations.filter(destination=>destination.countryCode==="GR"),hardConstraint=geographyConstraint(trip,catalog);const pre=preRankV8(trip,intent,catalog,30),minimum=hardConstraint?1:3;if(pre.length<minimum)return NextResponse.json({message:"Δεν υπάρχουν διαθέσιμες επιλογές για αυτόν τον συνδυασμό.",continuity:pendingContinuity()},{status:422});
  const weather=await enrichV8Weather(trip,pre.map(x=>x.destination),18),ranked=finalRankV8(trip,intent,pre,weather),selected=diversifyV8(ranked,12),selectedIds=new Set(selected.map(x=>x.destination.slug)),verifyPool=[...selected,...ranked.filter(x=>!selectedIds.has(x.destination.slug))].slice(0,18),verification=await verifyV8(trip,verifyPool),fixed=verification.checked&&!verification.passed?repair(selected,ranked,verification.rejectSlugs):selected,audited=await auditAndRepairV10(trip,fixed,ranked,12);if(!audited.audit.passed||!audited.items.length)return NextResponse.json({message:"Δεν μπορώ να επιβεβαιώσω επιλογές που ικανοποιούν με υψηλή βεβαιότητα όλα τα κριτήρια. Άλλαξε ένα αυστηρό κριτήριο.",continuity:pendingContinuity()},{status:422});
  const council=await runTravelCouncilV9(trip,audited.items),ordered=council.agreement==="STRONG"?[...audited.items].sort((a,b)=>a.destination.slug===council.finalSlug?-1:b.destination.slug===council.finalSlug?1:0):audited.items;
  const recommendations=toRecommendationsV8(trip,ordered).map(x=>({...x,dateWindows:buildSmartDateWindows(trip,x)}));
  const publicIntent={...intent,source:"structured" as const,interpretedText:undefined};
  const result:V8RecommendationResponse={version:9,experienceVersion:9,request:trip,generatedAt:new Date().toISOString(),source:"verified-travel-knowledge",intent:publicIntent,catalogSize:catalog.length,eligibleCount:ranked.length,explorationCount:Math.max(0,recommendations.length-3),mode:"guided",resultCount:recommendations.length,profileSummary:profileSummary(trip),feasibility:responseFeasibility(ordered),council,continuity:fullContinuity(),recommendations};
  await recordV8RecommendationSession(sessionId,trip,intent,recommendations);const response=NextResponse.json(result,{headers:{"cache-control":"no-store"}});response.cookies.set("travel_match_session",sessionId,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:7776000});return response;
 }catch{return NextResponse.json({message:"Οι επιλογές σου έχουν κρατηθεί. Χρειάζομαι λίγο ακόμη για να επιβεβαιώσω το αποτέλεσμα.",continuity:pendingContinuity()},{status:503})}
}
