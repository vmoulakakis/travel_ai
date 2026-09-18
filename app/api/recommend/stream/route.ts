import { TravelDecisionError } from "@/lib/ai/travel-orchestrator-v26";
import { runTravelOrchestratorV45 } from "@/lib/ai/travel-orchestrator-v45";
import { TRAVEL_PROFILE_COOKIE,travelerProfileKeyFromRequest } from "@/lib/ai/travel-intelligence-v45";
import { pendingContinuity,safePublicMessage } from "@/lib/continuity";
import { webflowCorsHeadersV31,webflowPreflightV31 } from "@/lib/http/webflow-cors-v31";
import { parseTripRequest } from "@/lib/validation/trip";

export const runtime="nodejs";
export const dynamic="force-dynamic";
type Payload=Record<string,unknown>;

export function OPTIONS(request:Request){return webflowPreflightV31(request,"POST, OPTIONS")}

export async function POST(request:Request){
 const cors=webflowCorsHeadersV31(request,"POST, OPTIONS"),body=await request.json().catch(()=>null),parsed=parseTripRequest(body);
 if(!parsed.success)return Response.json({message:"Χρειάζομαι έγκυρες ημερομηνίες και βασικές προτιμήσεις για να συνεχίσω.",continuity:pendingContinuity()},{status:400,headers:cors});
 const trip=parsed.data,sessionId=crypto.randomUUID(),profileKey=travelerProfileKeyFromRequest(request)??crypto.randomUUID(),encoder=new TextEncoder();
 const stream=new ReadableStream<Uint8Array>({async start(controller){
  let closed=false;
  const emit=(type:string,progress:number,payload:Payload={})=>{if(!closed)controller.enqueue(encoder.encode(`${JSON.stringify({type,progress,at:new Date().toISOString(),...payload})}\n`))};
  try{
   const result=await runTravelOrchestratorV45(trip,sessionId,profileKey,event=>emit(event.type,event.progress,event.payload));
   emit("final",100,{result});
  }catch(error){
   if(error instanceof TravelDecisionError)emit("continuity",100,{message:error.publicMessage,continuity:pendingContinuity()});
   else emit("continuity",100,{message:safePublicMessage(null,trip.language==="en"?"en":"el"),continuity:pendingContinuity()});
  }finally{if(!closed){closed=true;controller.close()}}
 }});
 const secure=process.env.NODE_ENV==="production"?"; Secure":"",headers=new Headers({...cors,"content-type":"application/x-ndjson; charset=utf-8","cache-control":"no-store, no-transform","x-content-type-options":"nosniff","x-travel-engine":"v45-persistent-knowledge"});
 headers.append("set-cookie",`travel_match_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=7776000${secure}`);
 headers.append("set-cookie",`${TRAVEL_PROFILE_COOKIE}=${profileKey}; Path=/; HttpOnly; SameSite=Lax; Max-Age=15552000${secure}`);
 return new Response(stream,{headers});
}
