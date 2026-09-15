import { runTravelOrchestratorV26, TravelDecisionError } from "@/lib/ai/travel-orchestrator-v26";
import { buildEscapeSolutionsV36 } from "@/lib/decision/solution-ranking-v36";
import { pendingContinuity, safePublicMessage } from "@/lib/continuity";
import { parseTripRequest } from "@/lib/validation/trip";
import type { V8RecommendationResponse } from "@/lib/decision/v8-types";

export const runtime="nodejs";
export const dynamic="force-dynamic";
type Payload=Record<string,unknown>;

export async function POST(request:Request){
 const body=await request.json().catch(()=>null),parsed=parseTripRequest(body);
 if(!parsed.success)return Response.json({message:"Χρειάζομαι έγκυρες ημερομηνίες και βασικές προτιμήσεις για να συνεχίσω.",continuity:pendingContinuity()},{status:400});
 const trip=parsed.data,sessionId=crypto.randomUUID(),encoder=new TextEncoder();
 const stream=new ReadableStream<Uint8Array>({async start(controller){
  let closed=false;
  const emit=(type:string,progress:number,payload:Payload={})=>{if(!closed)controller.enqueue(encoder.encode(`${JSON.stringify({type,progress,at:new Date().toISOString(),...payload})}\n`))};
  try{
   emit("understanding",4,{message:trip.language==="en"?"Understanding the need, not just the destination…":"Καταλαβαίνω την ανάγκη — όχι απλώς τον προορισμό…"});
   let base:V8RecommendationResponse|null=null;
   try{
    base=await runTravelOrchestratorV26(trip,sessionId,event=>emit(event.type,Math.min(54,Math.max(7,Math.round(event.progress*.54))),event.payload));
    emit("forward-ready",57,{message:trip.language==="en"?"Forward destination fit is ready. Now I challenge it with real stays…":"Το forward destination fit είναι έτοιμο. Τώρα το αμφισβητώ με πραγματικά καταλύματα…"});
   }catch(error){
    if(error instanceof TravelDecisionError)emit("forward-recovery",58,{message:trip.language==="en"?"The first pass was too restrictive. Switching to inventory-led recovery across the full catalog…":"Το πρώτο pass ήταν υπερβολικά περιοριστικό. Γυρίζω ανάποδα: πραγματικό inventory σε όλο το catalog…"});
    else emit("forward-recovery",58,{message:trip.language==="en"?"Forward pass was inconclusive. Recovering from real stay inventory…":"Το forward pass δεν έδωσε ασφαλή λύση. Ανακάμπτω από το πραγματικό stay inventory…"});
   }
   emit("inventory",64,{message:trip.language==="en"?"Scanning real stay inventory and checking dates, location, value and mood evidence…":"Σκανάρω πραγματικά καταλύματα και ελέγχω ημερομηνίες, θέση, αξία και mood evidence…"});
   const result=await buildEscapeSolutionsV36(trip,base,10);
   emit("reverse-rank",90,{message:trip.language==="en"?"Re-ranking the trip from the accommodation side — weak inventory pushes destinations down…":"Ξανακατατάσσω το ταξίδι από την πλευρά των καταλυμάτων — αδύναμο inventory ρίχνει προορισμούς…"});
   if(!result.solutions.length){emit("continuity",100,{message:trip.language==="en"?"I found no real stay-backed solution for this exact combination. Widen the dates or budget and I will rerun without inventing availability.":"Δεν βρήκα πραγματική λύση με κατάλυμα για αυτόν ακριβώς τον συνδυασμό. Άνοιξε λίγο ημερομηνίες ή budget και ξανατρέχω χωρίς να εφεύρω διαθεσιμότητα.",continuity:pendingContinuity()});}
   else emit("final",100,{result});
  }catch(error){emit("continuity",100,{message:safePublicMessage(error,trip.language==="en"?"en":"el"),continuity:pendingContinuity()});}
  finally{if(!closed){closed=true;controller.close();}}
 }});
 const secure=process.env.NODE_ENV==="production"?"; Secure":"";
 return new Response(stream,{headers:{"content-type":"application/x-ndjson; charset=utf-8","cache-control":"no-store, no-transform","x-content-type-options":"nosniff","x-travel-engine":"v36-global-bidirectional","set-cookie":`travel_match_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=7776000${secure}`}});
}
