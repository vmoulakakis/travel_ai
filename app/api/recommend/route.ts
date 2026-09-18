import { NextResponse } from "next/server";
import { TravelDecisionError } from "@/lib/ai/travel-orchestrator-v26";
import { runTravelOrchestratorV45 } from "@/lib/ai/travel-orchestrator-v45";
import { TRAVEL_PROFILE_COOKIE,TRAVEL_PROFILE_HEADER,travelerProfileKeyFromRequest } from "@/lib/ai/travel-intelligence-v45";
import { pendingContinuity } from "@/lib/continuity";
import { parseTripRequest } from "@/lib/validation/trip";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(request:Request){
 const body=await request.json().catch(()=>null),parsed=parseTripRequest(body);
 if(!parsed.success)return NextResponse.json({message:"Χρειάζομαι έγκυρες ημερομηνίες και βασικές προτιμήσεις για να συνεχίσω.",continuity:pendingContinuity()},{status:400});
 const trip=parsed.data,sessionId=crypto.randomUUID(),profileKey=travelerProfileKeyFromRequest(request)??crypto.randomUUID();
 try{
  const result=await runTravelOrchestratorV45(trip,sessionId,profileKey);
  const response=NextResponse.json(result,{headers:{"cache-control":"no-store","x-travel-engine":"v26-criterion-truth"}});
  response.cookies.set("travel_match_session",sessionId,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:7776000});
  response.cookies.set(TRAVEL_PROFILE_COOKIE,profileKey,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:15552000});
  response.headers.set(TRAVEL_PROFILE_HEADER,profileKey);
  return response;
 }catch(error){
  if(error instanceof TravelDecisionError)return NextResponse.json({message:error.publicMessage,continuity:pendingContinuity()},{status:error.status});
  return NextResponse.json({message:trip.language==="en"?"Your choices are saved, but the evidence check could not finish.":"Οι επιλογές σου έχουν κρατηθεί, αλλά ο έλεγχος στοιχείων δεν ολοκληρώθηκε.",continuity:pendingContinuity()},{status:503});
 }
}
