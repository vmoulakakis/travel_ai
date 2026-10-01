import {NextResponse} from "next/server";
import {loadJourneyBySlugV70} from "@/lib/ai/journey-store-v70";
import {asRecord,asString} from "@/lib/ai/agentic-model-v70";
import {requestOwnsProfileV70} from "@/lib/ai/v70-auth";

export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(request:Request){
 const url=new URL(request.url),slug=(url.searchParams.get("slug")??"").trim();if(!slug||slug.length>180)return NextResponse.json({error:"Invalid journey"},{status:400});
 const journey=await loadJourneyBySlugV70(slug).catch(()=>null);if(!journey||!requestOwnsProfileV70(request,journey.profile_key))return NextResponse.json({error:"Journey not found"},{status:404});
 const live=asRecord(journey.live_state),tracking=asRecord(live.trackingAction),code=asString(tracking.code,40),origin=url.origin;
 return NextResponse.json({version:70,journey:{id:journey.id,slug:journey.journey_slug,destinationKey:journey.destination_key,destinationName:journey.destination_name,status:journey.status,tripContext:journey.trip_context,itinerary:journey.itinerary,selectedStay:live.selectedStay??null,createdAt:journey.created_at,updatedAt:journey.updated_at},delivery:{pdfUrl:`${origin}/api/v70/journey/pdf?slug=${encodeURIComponent(slug)}`,emailEndpoint:`${origin}/api/v70/journey/email`,trackingUrl:code?`${origin}/api/v70/track?code=${encodeURIComponent(code)}`:null}},{headers:{"cache-control":"no-store","x-travel-engine":"v70-journey"}})
}
