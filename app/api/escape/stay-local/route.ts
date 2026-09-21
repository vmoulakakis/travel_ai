import { NextResponse } from "next/server";
import { parseTripRequest } from "@/lib/validation/trip";
import { loadV8DestinationCatalog,loadV8StayOfferById,loadV8StayOffers } from "@/lib/data/destination-v8";
import { getLocalIntelligenceV38 } from "@/lib/data/local-intelligence-v38";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=30;
const slugPattern=/^[a-z0-9-]{2,80}$/i,idPattern=/^[a-zA-Z0-9:_-]{1,180}$/;
const summer=(start:string,end:string)=>{for(let t=Date.parse(`${start}T00:00:00Z`),last=Date.parse(`${end}T00:00:00Z`);t<=last;t+=86400000){const m=new Date(t).getUTCMonth()+1;if(m>=6&&m<=9)return true}return false};

export async function POST(request:Request){
 try{
  const body=await request.json() as Record<string,unknown>,slug=String(body.slug??"").trim().toLowerCase(),offerId=String(body.offerId??"").trim(),parsed=parseTripRequest(body.trip);
  if(!parsed.success||!slugPattern.test(slug)||!idPattern.test(offerId))return NextResponse.json({message:"Invalid local intelligence request"},{status:400});
  const trip=parsed.data,[catalog,offers,directStay]=await Promise.all([loadV8DestinationCatalog(),loadV8StayOffers(slug,trip.startDate,trip.endDate,60).catch(()=>[]),loadV8StayOfferById(offerId).catch(()=>null)]),destination=catalog.find(x=>x.slug===slug),feedStay=offers.find(x=>x.sourceProductId===offerId),stay=feedStay??(directStay?.sourceProductId===offerId?directStay:null);if(!destination||!stay)return NextResponse.json({message:"Stay not found"},{status:404});
  const lat=stay.latitude??destination.latitude,lon=stay.longitude??destination.longitude,destinationName=trip.language==="en"?destination.nameEn:destination.nameEl;
  const local=await getLocalIntelligenceV38({destinationSlug:slug,destinationName,hotelName:stay.propertyName,latitude:lat,longitude:lon,isSummer:summer(trip.startDate,trip.endDate),language:trip.language==="en"?"en":"el"});
  return NextResponse.json({stay:{name:stay.propertyName,latitude:lat,longitude:lon,address:stay.address,city:stay.city},...local},{headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json({message:"Local intelligence unavailable"},{status:503,headers:{"cache-control":"no-store"}})}
}
