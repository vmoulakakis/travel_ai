import { NextResponse } from "next/server";
import { loadV8StayOffers } from "@/lib/data/destination-v8";
import { equivalentDateCandidates,tripCalendarKind } from "@/lib/decision/trip-calendar";
import { filterStayOffersV16 } from "@/lib/decision/stay-constraints-v16";
import { STAY_CONSTRAINT_KINDS_V16 } from "@/lib/decision/stay-constraints-v16";
import type { StayConstraintKind,StayConstraintSpec } from "@/lib/decision/v8-types";

export const runtime="nodejs";export const dynamic="force-dynamic";
const iso=/^\d{4}-\d{2}-\d{2}$/;
function safeRequirements(value:unknown):StayConstraintSpec{
 const row=value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{},read=(key:string)=>Array.isArray(row[key])?row[key].filter((item):item is StayConstraintKind=>typeof item==="string"&&STAY_CONSTRAINT_KINDS_V16.includes(item as StayConstraintKind)):[];
 const hard=[...new Set(read("hard"))],soft=[...new Set(read("soft").filter(kind=>!hard.includes(kind)))];return{hard,soft,confidence:"HIGH",source:"deterministic",needsSemanticAssist:false};
}
export async function POST(request:Request){
 try{
  const body=await request.json() as Record<string,unknown>,slug=String(body.slug??"").trim(),offerId=String(body.offerId??"").trim(),startDate=String(body.startDate??""),endDate=String(body.endDate??""),stayRequirements=safeRequirements(body.stayRequirements);
  if(!slug||!offerId||!iso.test(startDate)||!iso.test(endDate)||Date.parse(endDate)<=Date.parse(startDate))return NextResponse.json({message:"Invalid availability request"},{status:400});
  const current=await loadV8StayOffers(slug,startDate,endDate,40),eligible=filterStayOffersV16(current,stayRequirements).map(row=>row.offer),selected=eligible.find(item=>item.sourceProductId===offerId)??null,alternatives=eligible.filter(item=>item.sourceProductId!==offerId).slice(0,3);
  const windows=selected?[]:(await Promise.all(equivalentDateCandidates(startDate,endDate).map(async candidate=>{const offers=await loadV8StayOffers(slug,candidate.startDate,candidate.endDate,20),matching=filterStayOffersV16(offers,stayRequirements).map(row=>row.offer);return{...candidate,offers:matching.slice(0,3)}}))).filter(candidate=>candidate.offers.length).slice(0,3);
  return NextResponse.json({status:selected?"FEED_CONFIRMED":"UNCONFIRMED",checkedAt:new Date().toISOString(),calendar:tripCalendarKind(startDate,endDate),stayRequirements:{hard:stayRequirements.hard,soft:stayRequirements.soft},selected,alternatives,windows},{headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json({status:"UNAVAILABLE",message:"Live feed check unavailable"},{status:503,headers:{"cache-control":"no-store"}})}
}
