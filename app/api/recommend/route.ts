import { NextResponse } from "next/server";
import { interpretIntentV8 } from "@/lib/ai/intent-v8";
import { verifyV8 } from "@/lib/ai/openai-verifier-v8";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";
import { recordV8RecommendationSession } from "@/lib/data/match-learning-v8";
import { enrichV8Weather } from "@/lib/data/weather-v8";
import { diversifyV8,finalRankV8,preRankV8,toRecommendationsV8,type V8Ranked } from "@/lib/decision/v8-matcher";
import type { V8RecommendationResponse } from "@/lib/decision/v8-types";
import { parseTripRequest } from "@/lib/validation/trip";

export const runtime="nodejs";export const dynamic="force-dynamic";
function repair(selected:V8Ranked[],pool:V8Ranked[],reject:string[]){const bad=new Set(reject),kept=selected.filter(x=>!bad.has(x.destination.slug)),used=new Set(kept.map(x=>x.destination.slug));for(const x of pool){if(kept.length>=5)break;if(bad.has(x.destination.slug)||used.has(x.destination.slug))continue;kept.push(x);used.add(x.destination.slug)}return kept.slice(0,5)}

export async function POST(request:Request){
 const body=await request.json().catch(()=>null),parsed=parseTripRequest(body);if(!parsed.success)return NextResponse.json({error:"Invalid trip request",details:parsed.errors},{status:400});
 const trip=parsed.data,sessionId=crypto.randomUUID();
 try{
  const[intent,catalog]=await Promise.all([interpretIntentV8(trip),loadV8DestinationCatalog()]);const pre=preRankV8(trip,intent,catalog,14);if(pre.length<5)return NextResponse.json({error:"Not enough destination candidates"},{status:422});
  const weather=await enrichV8Weather(trip,pre.map(x=>x.destination),12),ranked=finalRankV8(trip,intent,pre,weather),selected=diversifyV8(ranked,5),selectedIds=new Set(selected.map(x=>x.destination.slug)),verifyPool=[...selected,...ranked.filter(x=>!selectedIds.has(x.destination.slug))].slice(0,8),verification=await verifyV8(trip,verifyPool),fixed=verification.checked&&!verification.passed?repair(selected,ranked,verification.rejectSlugs):selected;
  const recommendations=toRecommendationsV8(trip,fixed).map(x=>({...x,verifier:{checked:verification.checked,passed:true,reason:verification.reason,model:verification.model}}));
  const result:V8RecommendationResponse={version:8,request:trip,generatedAt:new Date().toISOString(),source:"destination-knowledge-v8",intent,catalogSize:catalog.length,mode:intent.source==="structured+deepseek"?"deepseek-intent":"deterministic",verifierUsed:verification.checked,recommendations};
  const response=NextResponse.json(result,{headers:{"cache-control":"no-store"}});response.cookies.set("travel_match_session",sessionId,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:7776000});void recordV8RecommendationSession(sessionId,trip,intent,recommendations);return response;
 }catch(error){return NextResponse.json({error:"V8 matching unavailable",detail:error instanceof Error?error.message:"unknown"},{status:503})}
}
