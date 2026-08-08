import { NextResponse } from "next/server";
import { loadV8StayOffers } from "@/lib/data/destination-v8";
import { recordV8DestinationSelection } from "@/lib/data/match-learning-v8";
import type { V8StayResponse } from "@/lib/decision/v8-types";

export const runtime="nodejs";export const dynamic="force-dynamic";
const iso=/^\d{4}-\d{2}-\d{2}$/;const cookie=/(?:^|;\s*)travel_match_session=([0-9a-f-]{36})(?:;|$)/i;
export async function GET(request:Request){
 const u=new URL(request.url),slug=(u.searchParams.get("slug")??u.searchParams.get("destination_id")??"").trim(),start=(u.searchParams.get("start_date")??"").trim(),end=(u.searchParams.get("end_date")??"").trim();if(!slug)return NextResponse.json({error:"slug required"},{status:400});if(!iso.test(start)||!iso.test(end)||Date.parse(end)<=Date.parse(start))return NextResponse.json({error:"valid start_date/end_date required"},{status:400});
 const session=request.headers.get("cookie")?.match(cookie)?.[1]??null;
 try{const[offers]=await Promise.all([loadV8StayOffers(slug,start,end,18),session?recordV8DestinationSelection(session,slug):Promise.resolve(false)]);const result:V8StayResponse={version:8,slug,startDate:start,endDate:end,offers,availabilityMeaning:"feed-validity-overlap-not-live-room-inventory"};return NextResponse.json(result,{headers:{"cache-control":"no-store"}})}catch(error){return NextResponse.json({error:"V8 stay lookup unavailable",detail:error instanceof Error?error.message:"unknown"},{status:503})}
}
