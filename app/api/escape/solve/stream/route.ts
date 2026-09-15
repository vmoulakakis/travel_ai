import { runTravelOrchestratorV26, TravelDecisionError } from "@/lib/ai/travel-orchestrator-v26";
import { buildEscapeSolutionsV35 } from "@/lib/decision/solution-ranking-v35";
import { pendingContinuity, safePublicMessage } from "@/lib/continuity";
import { parseTripRequest } from "@/lib/validation/trip";

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
      emit("understanding",5,{message:trip.language==="en"?"Understanding the trip shape…":"Καταλαβαίνω το σχήμα του ταξιδιού…"});
      const base=await runTravelOrchestratorV26(trip,sessionId,event=>emit(event.type,Math.min(62,Math.max(8,Math.round(event.progress*.62))),event.payload));
      emit("inventory",68,{message:trip.language==="en"?"Now checking real stay inventory for the strongest destinations…":"Τώρα ελέγχω πραγματικά καταλύματα στους ισχυρότερους προορισμούς…"});
      const result=await buildEscapeSolutionsV35(trip,base,10);
      emit("rerank",90,{message:trip.language==="en"?"Re-ranking destination fit against the stays we can actually offer…":"Ξαναβαθμολογώ το destination fit απέναντι στα καταλύματα που μπορούμε πράγματι να προτείνουμε…"});
      emit("final",100,{result});
    }catch(error){
      if(error instanceof TravelDecisionError)emit("continuity",100,{message:error.publicMessage,continuity:pendingContinuity()});
      else emit("continuity",100,{message:safePublicMessage(null,trip.language==="en"?"en":"el"),continuity:pendingContinuity()});
    }finally{if(!closed){closed=true;controller.close();}}
  }});
  const secure=process.env.NODE_ENV==="production"?"; Secure":"";
  return new Response(stream,{headers:{"content-type":"application/x-ndjson; charset=utf-8","cache-control":"no-store, no-transform","x-content-type-options":"nosniff","x-travel-engine":"v35-dual-pass","set-cookie":`travel_match_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=7776000${secure}`}});
}
