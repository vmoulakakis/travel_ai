import { runTravelOrchestratorV26, TravelDecisionError } from "@/lib/ai/travel-orchestrator-v26";
import { buildEscapeSolutionsV37 } from "@/lib/decision/solution-ranking-v37";
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
    base=await runTravelOrchestratorV26(trip,sessionId,event=>emit(event.type,Math.min(52,Math.max(7,Math.round(event.progress*.52))),event.payload));
    emit("forward-ready",54,{message:trip.language==="en"?"Semantic destination fit is ready. Now I reverse it against the full real stay catalog…":"Το semantic destination fit είναι έτοιμο. Τώρα το γυρίζω ανάποδα πάνω σε όλο το πραγματικό stay catalog…"});
   }catch(error){
    if(error instanceof TravelDecisionError)emit("forward-recovery",55,{message:trip.language==="en"?"The semantic pass was too restrictive. I am keeping the psychology profile and recovering from real inventory…":"Το semantic pass ήταν υπερβολικά περιοριστικό. Κρατάω το ψυχολογικό profile και ανακάμπτω από το πραγματικό inventory…"});
    else emit("forward-recovery",55,{message:trip.language==="en"?"The AI interpretation was inconclusive. I am switching to deterministic structured intent plus real inventory…":"Η AI ερμηνεία δεν ήταν αρκετά ασφαλής. Γυρίζω σε deterministic structured intent + πραγματικό inventory…"});
   }
   emit("inventory",62,{message:trip.language==="en"?"Scanning the complete joined Linkwise stay inventory — dates, geography, mood, value and evidence…":"Σκανάρω όλο το joined Linkwise stay inventory — ημερομηνίες, γεωγραφία, mood, αξία και evidence…"});
   const result=await buildEscapeSolutionsV37(trip,base,10);
   emit("reverse-rank",90,{message:trip.language==="en"?"Ranking from both directions: traveller → destination and real stays → traveller…":"Κατατάσσω και από τις δύο κατευθύνσεις: ταξιδιώτης → προορισμός και πραγματικά καταλύματα → ταξιδιώτης…"});
   if(!result.solutions.length)throw new Error("V37_NO_REAL_OPTIONS_AFTER_RECOVERY");
   emit("final",100,{result});
  }catch(error){
   emit("continuity",100,{message:trip.language==="en"?"The real inventory service failed, so I will not pretend there are zero options. Please retry — this is a system error, not a lack of stays.":"Απέτυχε το πραγματικό inventory service, οπότε δεν θα προσποιηθώ ότι υπάρχουν μηδέν επιλογές. Ξαναδοκίμασε — είναι system error, όχι έλλειψη καταλυμάτων.",detail:process.env.NODE_ENV!=="production"?safePublicMessage(error,trip.language==="en"?"en":"el"):undefined,continuity:pendingContinuity()});
  }finally{if(!closed){closed=true;controller.close();}}
 }});
 const secure=process.env.NODE_ENV==="production"?"; Secure":"";
 return new Response(stream,{headers:{"content-type":"application/x-ndjson; charset=utf-8","cache-control":"no-store, no-transform","x-content-type-options":"nosniff","x-travel-engine":"v37-global-inventory-recovery","set-cookie":`travel_match_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=7776000${secure}`}});
}
