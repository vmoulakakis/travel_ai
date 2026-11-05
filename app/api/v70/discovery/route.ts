import {NextResponse} from "next/server";
import {generateDiscovery50V70} from "@/lib/ai/travel-discovery-v70";
import {loadDiscoverySnapshotV70,type V70Locale} from "@/lib/ai/travel-intelligence-v70";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(request:Request){
 const url=new URL(request.url),locale:V70Locale=url.searchParams.get("locale")==="en"?"en":"el";
 try{
  const cached=await loadDiscoverySnapshotV70(locale,"default-greece");
  if(cached){
   return NextResponse.json({version:70,source:"snapshot",generatedAt:cached.generated_at,context:cached.context,picks:cached.picks,evidenceState:cached.evidence_state,modelLabel:cached.model_label},{headers:{"cache-control":"public, s-maxage=300, stale-while-revalidate=3600","x-travel-engine":"v70-agentic-discovery"}});
  }
  const generated=await generateDiscovery50V70(locale);
  return NextResponse.json({...generated,source:"generated"},{headers:{"cache-control":"public, s-maxage=300, stale-while-revalidate=3600","x-travel-engine":"v70-agentic-discovery"}});
 }catch(error){
  console.error("V70 discovery failed",error);
  return NextResponse.json({version:70,message:locale==="en"?"TravelAI could not refresh today's Greece discovery set.":"Το TravelAI δεν μπόρεσε να ανανεώσει τις σημερινές επιλογές για την Ελλάδα."},{status:503,headers:{"cache-control":"no-store","x-travel-engine":"v70-agentic-discovery"}});
 }
}
