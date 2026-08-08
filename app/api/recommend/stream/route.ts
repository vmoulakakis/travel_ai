import { interpretIntentV8 } from "@/lib/ai/intent-v8";
import { verifyV8 } from "@/lib/ai/openai-verifier-v8";
import { runTravelCouncilV9 } from "@/lib/ai/travel-council-v9";
import { fullContinuity, pendingContinuity, safePublicMessage } from "@/lib/continuity";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";
import { recordV8RecommendationSession } from "@/lib/data/match-learning-v8";
import { enrichV8Weather } from "@/lib/data/weather-v8";
import { buildSmartDateWindows } from "@/lib/decision/date-windows-v9";
import { diversifyV8,finalRankV8,preRankV8,toRecommendationsV8,type V8Ranked } from "@/lib/decision/v8-matcher";
import type { V8RecommendationResponse } from "@/lib/decision/v8-types";
import { parseTripRequest } from "@/lib/validation/trip";

export const runtime="nodejs";
export const dynamic="force-dynamic";
type Payload=Record<string,unknown>;

function repair(selected:V8Ranked[],pool:V8Ranked[],reject:string[]){if(!reject.length)return selected;const bad=new Set(reject),kept=selected.filter(x=>!bad.has(x.destination.slug)),used=new Set(kept.map(x=>x.destination.slug));for(const x of pool){if(kept.length>=5)break;if(bad.has(x.destination.slug)||used.has(x.destination.slug))continue;kept.push(x);used.add(x.destination.slug)}return kept.slice(0,5)}

export async function POST(request:Request){
 const body=await request.json().catch(()=>null),parsed=parseTripRequest(body);if(!parsed.success)return Response.json({message:"Χρειάζομαι έγκυρες ημερομηνίες και βασικές προτιμήσεις για να συνεχίσω.",continuity:pendingContinuity()},{status:400});
 const trip=parsed.data,sessionId=crypto.randomUUID(),encoder=new TextEncoder();
 const stream=new ReadableStream<Uint8Array>({async start(controller){let closed=false;const emit=(type:string,progress:number,payload:Payload={})=>{if(!closed)controller.enqueue(encoder.encode(`${JSON.stringify({type,progress,at:new Date().toISOString(),...payload})}\n`))};
  try{
   emit("understand:start",8,{hasFreeText:Boolean(trip.tripText)});emit("catalog:start",12);
   const[intent,catalog]=await Promise.all([interpretIntentV8(trip),loadV8DestinationCatalog()]);
   emit("understand:ready",24,{summary:intent.summary});emit("catalog:ready",36,{catalogSize:catalog.length,domestic:catalog.filter(x=>x.countryCode==="GR").length,abroad:catalog.filter(x=>x.countryCode!=="GR").length});
   const pre=preRankV8(trip,intent,catalog,14);if(pre.length<5){emit("continuity",100,{message:safePublicMessage(null,trip.language==="en"?"en":"el"),continuity:pendingContinuity()});return;}
   emit("shortlist:ready",52,{preview:pre.slice(0,7).map(x=>({destination:trip.language==="en"?x.destination.nameEn:x.destination.nameEl}))});
   emit("weather:start",60,{candidates:Math.min(12,pre.length)});
   const weather=await enrichV8Weather(trip,pre.map(x=>x.destination),12),ranked=finalRankV8(trip,intent,pre,weather),selected=diversifyV8(ranked,5);
   emit("weather:ready",80,{checked:weather.size,preview:selected.map(x=>({destination:trip.language==="en"?x.destination.nameEn:x.destination.nameEl}))});
   const selectedSlugs=new Set(selected.map(x=>x.destination.slug)),verificationPool=[...selected,...ranked.filter(x=>!selectedSlugs.has(x.destination.slug))].slice(0,8);
   emit("verify:start",86,{conditional:true});const verification=await verifyV8(trip,verificationPool),fixed=verification.checked&&!verification.passed?repair(selected,ranked,verification.rejectSlugs):selected;
   emit("verify:ready",91,{checked:verification.checked,corrected:verification.checked&&!verification.passed});
   emit("council:start",93);
   const council=await runTravelCouncilV9(trip,fixed),ordered=council.agreement==="STRONG"?[...fixed].sort((a,b)=>a.destination.slug===council.finalSlug?-1:b.destination.slug===council.finalSlug?1:0):fixed;
   const recommendations=toRecommendationsV8(trip,ordered).map(x=>({...x,dateWindows:buildSmartDateWindows(trip,x)}));
   emit("council:ready",97,{agreement:council.agreement});
   const publicIntent={...intent,source:"structured" as const,interpretedText:undefined};
   const result:V8RecommendationResponse={version:9,experienceVersion:9,request:trip,generatedAt:new Date().toISOString(),source:"verified-travel-knowledge",intent:publicIntent,catalogSize:catalog.length,mode:"guided",council,continuity:fullContinuity(),recommendations};
   emit("final",100,{result});void recordV8RecommendationSession(sessionId,trip,intent,recommendations);
  }catch{emit("continuity",100,{message:safePublicMessage(null,trip.language==="en"?"en":"el"),continuity:pendingContinuity()})}finally{if(!closed){closed=true;controller.close()}}
 }});
 const secure=process.env.NODE_ENV==="production"?"; Secure":"";
 return new Response(stream,{headers:{"content-type":"application/x-ndjson; charset=utf-8","cache-control":"no-store, no-transform","x-content-type-options":"nosniff","set-cookie":`travel_match_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=7776000${secure}`}})
}
