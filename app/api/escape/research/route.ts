import { NextResponse } from "next/server";
import { parseTripRequest } from "@/lib/validation/trip";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";
import { getDailyTripWeatherV25 } from "@/lib/data/trip-weather-v25";
import { getLocalIntelligenceV38 } from "@/lib/data/local-intelligence-v38";
import { researchDestination } from "@/lib/ai/destination-research";
import { estimateBeyondHotelBudgetV25 } from "@/lib/decision/trip-budget-v25";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
const slugPattern=/^[a-z0-9-]{2,80}$/i,DAY=86_400_000;
function isSummer(startDate:string,endDate:string){for(let t=Date.parse(`${startDate}T00:00:00Z`),last=Date.parse(`${endDate}T00:00:00Z`);t<=last;t+=DAY){const m=new Date(t).getUTCMonth()+1;if(m>=6&&m<=9)return true}return false}

export async function POST(request:Request){
 try{
  const body=await request.json() as Record<string,unknown>,parsed=parseTripRequest(body.trip),slug=String(body.slug??"").trim().toLowerCase();
  if(!parsed.success||!slugPattern.test(slug))return NextResponse.json({message:"Invalid destination research request",errors:parsed.success?[]:parsed.errors},{status:400});
  const trip=parsed.data,catalog=await loadV8DestinationCatalog(),destination=catalog.find(item=>item.slug===slug);if(!destination)return NextResponse.json({message:"Destination not found"},{status:404});
  const destinationName=trip.language==="en"?destination.nameEn:destination.nameEl,summer=isSummer(trip.startDate,trip.endDate);
  const[weather,localIntelligence,research]=await Promise.all([
   getDailyTripWeatherV25(trip,destination.latitude,destination.longitude),
   getLocalIntelligenceV38({destinationSlug:slug,destinationName,hotelName:null,latitude:destination.latitude,longitude:destination.longitude,isSummer:summer,language:trip.language==="en"?"en":"el"}),
   researchDestination({destination:destinationName,latitude:destination.latitude,longitude:destination.longitude,language:trip.language==="en"?"en":"el",travelerType:trip.travelerType,moods:trip.moods,nights:trip.nights})
  ]);
  const budgetBeyondHotel=estimateBeyondHotelBudgetV25(trip,destination.costTier),toLegacy=(kind:string,rows:typeof localIntelligence.restaurants)=>rows.map(row=>({locationId:row.id,kind,name:row.name,description:null,rating:row.rating,reviewCount:row.ratingCount,ranking:row.ranking,rankingLabel:null,address:row.address,webUrl:row.url,imageUrl:row.imageUrl,ratingImageUrl:null,sourceMonth:new Intl.DateTimeFormat("en-US",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date()),source:row.source,internalSignal:row.internalSignal}));
  const places={status:localIntelligence.status,attribution:localIntelligence.providers.join(" + ")||"Open data",sourceMonth:new Intl.DateTimeFormat("en-US",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date()),hotel:null,places:toLegacy("place",localIntelligence.attractions),museums:toLegacy("museum",localIntelligence.museums),restaurants:toLegacy("restaurant",localIntelligence.restaurants),nightlife:toLegacy("nightlife",localIntelligence.nightlife),beaches:toLegacy("beach",localIntelligence.beaches),cafes:toLegacy("cafe",localIntelligence.cafes),note:localIntelligence.sourceDisclosure};
  return NextResponse.json({release:"V38",generatedAt:new Date().toISOString(),destination:{slug:destination.slug,name:destination.nameEl,nameEn:destination.nameEn,latitude:destination.latitude,longitude:destination.longitude,isSummer:summer},trip,weather,places,localIntelligence,research:{source:research.source,overview:research.overview??null,attractions:research.attractions.slice(0,8),practicalNotes:research.practicalNotes.slice(0,8),sources:research.sources.slice(0,12)},budgetBeyondHotel},{headers:{"cache-control":"no-store","x-travel-engine":"v38-cinematic-360"}});
 }catch(error){return NextResponse.json({message:"Destination research is still being verified.",detail:process.env.NODE_ENV==="development"&&error instanceof Error?error.message:undefined},{status:503,headers:{"cache-control":"no-store"}})}
}
