import { NextResponse } from "next/server";
import { loadV8StayOffers } from "@/lib/data/destination-v8";
import { equivalentDateCandidates,tripCalendarKind } from "@/lib/decision/trip-calendar";

export const runtime="nodejs";export const dynamic="force-dynamic";
const iso=/^\d{4}-\d{2}-\d{2}$/;
export async function POST(request:Request){
 try{
  const body=await request.json() as Record<string,unknown>,slug=String(body.slug??"").trim(),offerId=String(body.offerId??"").trim(),startDate=String(body.startDate??""),endDate=String(body.endDate??"");
  if(!slug||!offerId||!iso.test(startDate)||!iso.test(endDate)||Date.parse(endDate)<=Date.parse(startDate))return NextResponse.json({message:"Invalid availability request"},{status:400});
  const current=await loadV8StayOffers(slug,startDate,endDate,30),selected=current.find(item=>item.sourceProductId===offerId)??null,alternatives=current.filter(item=>item.sourceProductId!==offerId).slice(0,3);
  const windows=selected?[]:(await Promise.all(equivalentDateCandidates(startDate,endDate).map(async candidate=>{const offers=await loadV8StayOffers(slug,candidate.startDate,candidate.endDate,6);return{...candidate,offers:offers.slice(0,3)}}))).filter(candidate=>candidate.offers.length).slice(0,3);
  return NextResponse.json({status:selected?"FEED_CONFIRMED":"UNCONFIRMED",checkedAt:new Date().toISOString(),calendar:tripCalendarKind(startDate,endDate),selected,alternatives,windows},{headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json({status:"UNAVAILABLE",message:"Live feed check unavailable"},{status:503,headers:{"cache-control":"no-store"}})}
}
