import {NextResponse} from "next/server";
import {buildJourneyV70} from "@/lib/ai/journey-builder-v70";
import {loadOwnedSessionV70} from "@/lib/ai/v70-auth";

export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=60;
export async function POST(request:Request){
 const body=await request.json().catch(()=>null) as Record<string,unknown>|null,sessionId=typeof body?.sessionId==="string"?body.sessionId:"",sourceProductId=typeof body?.sourceProductId==="string"?body.sourceProductId.trim():"";
 if(!sessionId||!sourceProductId)return NextResponse.json({version:70,error:"sessionId and sourceProductId are required"},{status:400});
 const session=await loadOwnedSessionV70(request,sessionId).catch(()=>null);if(!session)return NextResponse.json({version:70,error:"Session not found"},{status:404});
 try{
  const built=await buildJourneyV70({session,sourceProductId}),origin=new URL(request.url).origin,slug=encodeURIComponent(built.journey.journey_slug),code=encodeURIComponent(built.trackingCode);
  return NextResponse.json({version:70,sessionId,journey:{id:built.journey.id,slug:built.journey.journey_slug,destination:built.destination,stay:built.stay,itinerary:built.plan,model:built.model},delivery:{journeyUrl:`${origin}/api/v70/journey?slug=${slug}`,pdfUrl:`${origin}/api/v70/journey/pdf?slug=${slug}`,emailEndpoint:`${origin}/api/v70/journey/email`,emailPayload:{journeySlug:built.journey.journey_slug},trackingUrl:`${origin}/api/v70/track?code=${code}`}}, {headers:{"cache-control":"no-store","x-travel-engine":"v70-journey"}});
 }catch(error){console.error("V70 journey finalization failed",error);return NextResponse.json({version:70,error:error instanceof Error?error.message:"Journey finalization failed"},{status:409,headers:{"cache-control":"no-store"}})}
}
