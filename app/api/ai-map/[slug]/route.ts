import { NextResponse } from "next/server";
import { getBookingCitySignalV30 } from "@/lib/data/booking-demand-v30";
import { loadV8DestinationCatalog,loadV8StayOffers } from "@/lib/data/destination-v8";
import { buildInventoryDestinationOptionsV15,loadActiveStayCitiesV15 } from "@/lib/data/stay-cities-v15";
import { getTripadvisorBundleV25,getTripadvisorCitySignalV30 } from "@/lib/data/tripadvisor-v25";
import { webflowCorsHeadersV31,webflowPreflightV31 } from "@/lib/http/webflow-cors-v31";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const iso=(date:Date)=>date.toISOString().slice(0,10);
const addDays=(date:Date,days:number)=>new Date(date.getTime()+days*86400000);

export function OPTIONS(request:Request){return webflowPreflightV31(request,"GET, OPTIONS")}

export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}){
 const cors=webflowCorsHeadersV31(request,"GET, OPTIONS");
 try{
  const{slug}=await params,url=new URL(request.url),lang=url.searchParams.get("lang")==="en"?"en":"el",catalog=await loadV8DestinationCatalog(),destination=catalog.find(item=>item.countryCode==="GR"&&item.slug===slug);
  if(!destination)return NextResponse.json({error:"Destination not found"},{status:404,headers:cors});
  const now=new Date(),startDate=iso(addDays(now,30)),endDate=iso(addDays(now,32)),isSummer=Number(startDate.slice(5,7))>=5&&Number(startDate.slice(5,7))<=10;
  const[cities,tripadvisor,tripadvisorSignal,booking,offers]=await Promise.all([loadActiveStayCitiesV15(),getTripadvisorBundleV25({destinationName:lang==="en"?destination.nameEn:destination.nameEl,hotelName:null,latitude:destination.latitude,longitude:destination.longitude,isSummer,language:lang}),getTripadvisorCitySignalV30({destinationName:lang==="en"?destination.nameEn:destination.nameEl,latitude:destination.latitude,longitude:destination.longitude,language:lang}),getBookingCitySignalV30({latitude:destination.latitude,longitude:destination.longitude,radiusKm:destination.hotelRadiusKm,language:lang}),loadV8StayOffers(destination.slug,startDate,endDate,8).catch(()=>[])]),inventory=buildInventoryDestinationOptionsV15(cities,[destination],lang)[0]??null;
  const trustedOffers=offers.slice(0,4).map(offer=>({propertyName:offer.propertyName,price:offer.price,currency:offer.currency,trackingUrl:offer.trackingUrl,validTo:offer.validTo,sourceProgram:offer.programId}));
  return NextResponse.json({version:30,destination:{slug:destination.slug,nameEl:destination.nameEl,nameEn:destination.nameEn,latitude:destination.latitude,longitude:destination.longitude,regionGroup:destination.regionGroup,tags:destination.tags,monthFit:destination.monthFit,costTier:destination.costTier,crowdLevel:destination.crowdLevel,routeConfidence:destination.routeConfidence},inventory,tripadvisorSignal,tripadvisor,booking,stayWindow:{startDate,endDate,offers:trustedOffers},trustPolicy:"Ratings, review counts and rankings are displayed only when returned by their source APIs. Missing data is shown as unavailable, never estimated."},{headers:{...cors,"cache-control":"public, max-age=300, s-maxage=21600, stale-while-revalidate=43200","x-content-type-options":"nosniff"}});
 }catch{return NextResponse.json({error:"Destination evidence temporarily unavailable"},{status:503,headers:{...cors,"cache-control":"no-store"}})}
}
