import { NextResponse } from "next/server";
import { getStayRatingQuickV50 } from "@/lib/data/stay-review-intelligence-v39";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const slug=/^[a-z0-9-]{2,80}$/i;
const id=/^[a-zA-Z0-9:_-]{1,180}$/;
const finite=(v:unknown)=>Number.isFinite(Number(v))?Number(v):null;
const text=(v:unknown,max:number)=>typeof v==="string"?v.trim().slice(0,max):"";

export async function POST(request:Request){
 try{
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  const propertyName=text(body?.propertyName,180),sourceProductId=text(body?.sourceProductId,180),destinationSlug=text(body?.destinationSlug,80).toLowerCase(),destinationName=text(body?.destinationName,160),latitude=finite(body?.latitude),longitude=finite(body?.longitude);
  if(!propertyName||!id.test(sourceProductId)||!slug.test(destinationSlug)||!destinationName){
   return NextResponse.json({ok:false,error:"invalid_rating_request"},{status:400});
  }
  const result=await getStayRatingQuickV50({propertyName,sourceProductId,destinationSlug,destinationName,latitude,longitude,language:"el"});
  return NextResponse.json({ok:true,result},{headers:{"cache-control":"public, s-maxage=1800, stale-while-revalidate=7200","x-travel-rating":"v50-quick"}});
 }catch{
  return NextResponse.json({ok:true,result:null,degraded:true},{status:200,headers:{"cache-control":"public, max-age=60","x-travel-rating":"degraded"}});
 }
}
