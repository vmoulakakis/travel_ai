import { NextResponse } from "next/server";
import { interpretIntentV8 } from "@/lib/ai/intent-v8";
import { verifyV8 } from "@/lib/ai/openai-verifier-v8";
import { runTravelCouncilV9 } from "@/lib/ai/travel-council-v9";
import { fullContinuity, pendingContinuity } from "@/lib/continuity";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";
import { recordV8RecommendationSession } from "@/lib/data/match-learning-v8";
import { enrichV8Weather } from "@/lib/data/weather-v8";
import { buildSmartDateWindows } from "@/lib/decision/date-windows-v9";
import { diversifyV8,finalRankV8,preRankV8,toRecommendationsV8,type V8Ranked } from "@/lib/decision/v8-matcher";
import type { V8RecommendationResponse } from "@/lib/decision/v8-types";
import { parseTripRequest } from "@/lib/validation/trip";

export const runtime="nodejs";export const dynamic="force-dynamic";
function repair(selected:V8Ranked[],pool:V8Ranked[],reject:string[]){const bad=new Set(reject),kept=selected.filter(x=>!bad.has(x.destination.slug)),used=new Set(kept.map(x=>x.destination.slug));for(const x of pool){if(kept.length>=3)break;if(bad.has(x.destination.slug)||used.has(x.destination.slug))continue;kept.push(x);used.add(x.destination.slug)}return kept.slice(0,3)}

export async function POST(request:Request){
 const body=await request.json().catch(()=>null),parsed=parseTripRequest(body);if(!parsed.success)return NextResponse.json({message:"Χρειάζομαι έγκυρες ημερομηνίες και βασικές προτιμήσεις για να συνεχίσω.",continuity:pendingContinuity()},{status:400});
 const trip=parsed.data,sessionId=crypto.randomUUID();
 try{
  const[intent,allDestinations]=await Promise.all([interpretIntentV8(trip),loadV8DestinationCatalog()]),catalog=allDestinations.filter(destination=>destination.countryCode==="GR");const pre=preRankV8(trip,intent,catalog,14);if(pre.length<5)return NextResponse.json({message:"Δεν υπάρχουν ακόμη αρκετές ασφαλείς επιλογές για αυτόν τον συνδυασμό. Δοκίμασε λίγο πιο ανοιχτά κριτήρια.",continuity:pendingContinuity()},{status:422});
  const weather=await enrichV8Weather(trip,pre.map(x=>x.destination),12),ranked=finalRankV8(trip,intent,pre,weather),selected=diversifyV8(ranked,3),selectedIds=new Set(selected.map(x=>x.destination.slug)),verifyPool=[...selected,...ranked.filter(x=>!selectedIds.has(x.destination.slug))].slice(0,8),verification=await verifyV8(trip,verifyPool),fixed=verification.checked&&!verification.passed?repair(selected,ranked,verification.rejectSlugs):selected;
  const council=await runTravelCouncilV9(trip,fixed),ordered=council.agreement==="STRONG"?[...fixed].sort((a,b)=>a.destination.slug===council.finalSlug?-1:b.destination.slug===council.finalSlug?1:0):fixed;
  const recommendations=toRecommendationsV8(trip,ordered).map(x=>({...x,dateWindows:buildSmartDateWindows(trip,x)}));
  const publicIntent={...intent,source:"structured" as const,interpretedText:undefined};
  const result:V8RecommendationResponse={version:9,experienceVersion:9,request:trip,generatedAt:new Date().toISOString(),source:"verified-travel-knowledge",intent:publicIntent,catalogSize:catalog.length,mode:"guided",council,continuity:fullContinuity(),recommendations};
  await recordV8RecommendationSession(sessionId,trip,intent,recommendations);const response=NextResponse.json(result,{headers:{"cache-control":"no-store"}});response.cookies.set("travel_match_session",sessionId,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:7776000});return response;
 }catch{return NextResponse.json({message:"Οι επιλογές σου έχουν κρατηθεί. Χρειάζομαι λίγο ακόμη για να επιβεβαιώσω το αποτέλεσμα.",continuity:pendingContinuity()},{status:503})}
}
