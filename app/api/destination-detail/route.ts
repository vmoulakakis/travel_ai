import { NextResponse } from "next/server";
import { loadAffiliateDestinationDetail } from "@/lib/data/affiliate-universe";
import { recordDestinationSelection } from "@/lib/data/match-learning";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const isoDate=/^\d{4}-\d{2}-\d{2}$/;
const sessionCookie=/(?:^|;\s*)travel_match_session=([0-9a-f-]{36})(?:;|$)/i;

export async function GET(request:Request){
  const url=new URL(request.url),destinationId=url.searchParams.get("destination_id")?.trim(),startDate=url.searchParams.get("start_date")?.trim()??"",endDate=url.searchParams.get("end_date")?.trim()??"";
  if(!destinationId)return NextResponse.json({error:"destination_id required"},{status:400});
  if(!isoDate.test(startDate)||!isoDate.test(endDate)||Date.parse(endDate)<=Date.parse(startDate))return NextResponse.json({error:"valid start_date/end_date required"},{status:400});
  const sessionId=request.headers.get("cookie")?.match(sessionCookie)?.[1]??null;
  try{
    const [detail]=await Promise.all([loadAffiliateDestinationDetail(destinationId,{startDate,endDate}),sessionId?recordDestinationSelection(sessionId,destinationId):Promise.resolve(false)]);
    return NextResponse.json(detail,{headers:{"cache-control":"no-store"}});
  }catch(error){return NextResponse.json({error:"Destination offer detail unavailable",detail:error instanceof Error?error.message:"unknown error"},{status:503})}
}
