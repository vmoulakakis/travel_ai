import {loadJourneyBySlugV70} from "@/lib/ai/journey-store-v70";
import {renderJourneyPdfV70} from "@/lib/ai/journey-pdf-v70";
import {requestOwnsProfileV70} from "@/lib/ai/v70-auth";

export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=60;
export async function GET(request:Request){
 const url=new URL(request.url),slug=(url.searchParams.get("slug")??"").trim();if(!slug||slug.length>180)return Response.json({error:"Invalid journey"},{status:400});
 const journey=await loadJourneyBySlugV70(slug).catch(()=>null);if(!journey||!requestOwnsProfileV70(request,journey.profile_key))return Response.json({error:"Journey not found"},{status:404});
 const bytes=await renderJourneyPdfV70(journey,url.origin),filename=journey.pdf_filename||"TravelAI_Journey.pdf";return new Response(bytes,{headers:{"content-type":"application/pdf","content-disposition":`inline; filename*=UTF-8''${encodeURIComponent(filename)}`,"cache-control":"private, no-store","x-travel-guide":"v70-journey"}})
}
