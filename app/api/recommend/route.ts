import { NextResponse } from "next/server";
import { TravelDecisionError,runTravelOrchestratorV26 } from "@/lib/ai/travel-orchestrator-v26";
import { pendingContinuity } from "@/lib/continuity";
import { parseTripRequest } from "@/lib/validation/trip";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(request:Request){
 const body=await request.json().catch(()=>null),parsed=parseTripRequest(body);
 if(!parsed.success)return NextResponse.json({message:"Χρειάζομαι έγκυρες ημερομηνίες και βασικές προτιμήσεις για να συνεχίσω.",continuity:pendingContinuity()},{status:400});
 const trip=parsed.data,sessionId=crypto.randomUUID();
 try{
  const result=await runTravelOrchestratorV26(trip,sessionId);
  const response=NextResponse.json(result,{headers:{"cache-control":"no-store","x-travel-engine":"v26-criterion-truth"}});
  response.cookies.set("travel_match_session",sessionId,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:7776000});
  return response;
 }catch(error){
  if(error instanceof TravelDecisionError)return NextResponse.json({message:error.publicMessage,continuity:pendingContinuity()},{status:error.status});
  return NextResponse.json({message:trip.language==="en"?"Your choices are saved, but the evidence check could not finish.":"Οι επιλογές σου έχουν κρατηθεί, αλλά ο έλεγχος στοιχείων δεν ολοκληρώθηκε.",continuity:pendingContinuity()},{status:503});
 }
}
