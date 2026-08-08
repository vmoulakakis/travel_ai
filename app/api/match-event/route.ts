import { NextResponse } from "next/server";
import { encodeTripSemantics } from "@/lib/decision/semantic-matcher";
import { parseTripRequest } from "@/lib/validation/trip";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const events=new Set(["destination_selected","offer_view","offer_unlock","outbound_click"]);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request:Request){
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  if(!body)return NextResponse.json({error:"Invalid JSON"},{status:400});
  const sessionId=typeof body.sessionId==="string"?body.sessionId:"",eventName=typeof body.eventName==="string"?body.eventName:"";
  if(!uuid.test(sessionId)||!events.has(eventName))return NextResponse.json({error:"Invalid event"},{status:400});
  const parsed=parseTripRequest(body.request);if(!parsed.success)return NextResponse.json({error:"Invalid trip request"},{status:400});
  const b=body.breakdown&&typeof body.breakdown==="object"?body.breakdown as Record<string,unknown>:{};
  const pct=(k:string,def=50)=>Math.max(0,Math.min(1,(Number.isFinite(Number(b[k]))?Number(b[k]):def)/100));
  const pairFeatures=[pct("semantic"),pct("weather"),pct("seasonality"),pct("value"),pct("demand"),pct("effort"),pct("supply"),pct("luxury"),pct("stayFit"),.5,.6,pct("intent")];
  const secret=process.env.SUPABASE_INGEST_SECRET;
  if(!secret)return new NextResponse(null,{status:204});
  const endpoint=process.env.SUPABASE_MATCH_LEARNING_URL??"https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/match-learning";
  const constraints={origin:parsed.data.origin,startDate:parsed.data.startDate,endDate:parsed.data.endDate,nights:parsed.data.nights,budget:parsed.data.budget,moods:parsed.data.moods,travelerType:parsed.data.travelerType,distancePreference:parsed.data.distancePreference,pace:parsed.data.pace,hotelStyle:parsed.data.hotelStyle,avoid:parsed.data.avoid};
  try{
    const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json","x-match-secret":secret},body:JSON.stringify({sessionId,eventName,destinationId:typeof body.destinationId==="string"?body.destinationId:null,sourceProductId:typeof body.sourceProductId==="string"?body.sourceProductId:null,travelMonth:Number(parsed.data.startDate.slice(5,7)),featureVector:encodeTripSemantics(parsed.data),pairFeatures,constraints,modelVersion:typeof body.modelVersion==="string"?body.modelVersion:"semantic-neural-v1"}),signal:AbortSignal.timeout(3000)});
    if(!response.ok)return new NextResponse(null,{status:204});
    return NextResponse.json({ok:true});
  }catch{return new NextResponse(null,{status:204})}
}
