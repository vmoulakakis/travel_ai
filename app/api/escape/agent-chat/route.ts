import { NextResponse } from "next/server";
import { parseTripRequest } from "@/lib/validation/trip";
import { loadV8DestinationCatalog,loadV8StayOffers } from "@/lib/data/destination-v8";
import { getLocalIntelligenceV38 } from "@/lib/data/local-intelligence-v38";
import { getDailyTripWeatherV25 } from "@/lib/data/trip-weather-v25";
import { createLLMRequestBudgetV16,generateJsonWithRoutingV16 } from "@/lib/ai/model-router-v9";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=30;

const slugPattern=/^[a-z0-9-]{2,80}$/i,idPattern=/^[a-zA-Z0-9:_-]{1,180}$/;
const clip=(v:unknown,n:number)=>typeof v==="string"?v.trim().slice(0,n):"";
const summer=(start:string,end:string)=>{for(let t=Date.parse(`${start}T00:00:00Z`),last=Date.parse(`${end}T00:00:00Z`);t<=last;t+=86400000){const m=new Date(t).getUTCMonth()+1;if(m>=6&&m<=9)return true}return false};

export async function POST(request:Request){
 try{
  const body=await request.json() as Record<string,unknown>,message=clip(body.message,600),slug=clip(body.slug,80).toLowerCase(),offerId=clip(body.offerId,180),parsed=parseTripRequest(body.trip);
  if(!message||!slugPattern.test(slug)||!idPattern.test(offerId)||!parsed.success)return NextResponse.json({message:"Invalid agent request"},{status:400});
  const trip=parsed.data,[catalog,offers]=await Promise.all([loadV8DestinationCatalog(),loadV8StayOffers(slug,trip.startDate,trip.endDate,60)]),destination=catalog.find(x=>x.slug===slug),stay=offers.find(x=>x.sourceProductId===offerId);
  if(!destination||!stay)return NextResponse.json({message:"Stay context not found"},{status:404});
  const lat=stay.latitude??destination.latitude,lon=stay.longitude??destination.longitude,destinationName=trip.language==="en"?destination.nameEn:destination.nameEl;
  const[local,weather]=await Promise.all([
   getLocalIntelligenceV38({destinationSlug:slug,destinationName,hotelName:stay.propertyName,latitude:lat,longitude:lon,isSummer:summer(trip.startDate,trip.endDate),language:trip.language==="en"?"en":"el"}),
   getDailyTripWeatherV25(trip,lat,lon)
  ]);
  const places=[...local.attractions.slice(0,4),...local.restaurants.slice(0,4),...local.nightlife.slice(0,3),...local.beaches.slice(0,3)].map(p=>({name:p.name,kind:p.kind,rating:p.rating,reviews:p.ratingCount,distanceKm:p.distanceKm,address:p.address,source:p.source}));
  const weatherText=weather.days.map(d=>`${d.date}: ${d.summary}${d.temperatureMaxC!=null?`, ${d.temperatureMaxC}C`:""}`).join(" | ");
  const fallback=trip.language==="en"?`I’ve kept your selected stay (${stay.propertyName}) fixed. I can adjust the pace, food, nearby places or day structure without changing your accommodation.`:`Κρατάω σταθερό το επιλεγμένο κατάλυμα (${stay.propertyName}). Μπορώ να αλλάξω ρυθμό, φαγητό, κοντινά μέρη ή τη δομή των ημερών χωρίς να σου αλλάξω ξανά κατάλυμα.`;
  const routed=await generateJsonWithRoutingV16<{reply:string;preferenceTags:string[]}>({
   context:{task:"research",text:message,deterministicConfidence:.5,forceSemantic:true},budget:createLLMRequestBudgetV16(),preference:"creative",
   system:"You are the Travel Agent inside a Greek travel decision product. Answer as a concise expert concierge. Use only the supplied grounded trip/stay/weather/place context. Never invent ratings, events, availability, prices or review claims. Do not give external links. Keep the selected accommodation fixed unless the user explicitly asks to reconsider it. If evidence is missing, say so. Reply in the user's language.",
   prompt:JSON.stringify({message,trip:{origin:trip.origin,startDate:trip.startDate,endDate:trip.endDate,nights:trip.nights,budget:trip.budget,moods:trip.moods,travelerType:trip.travelerType,pace:trip.pace},destination:destinationName,stay:{name:stay.propertyName,city:stay.city,address:stay.address,price:stay.price,currency:stay.currency},weather:weatherText,nearbyPlaces:places,providers:local.providers}),
   validate:value=>typeof value.reply==="string"&&value.reply.trim()?{reply:value.reply.trim().slice(0,900),preferenceTags:Array.isArray(value.preferenceTags)?value.preferenceTags.filter((x):x is string=>typeof x==="string").slice(0,6):[]}:null
  });
  return NextResponse.json({reply:routed?.value.reply??fallback,preferenceTags:routed?.value.preferenceTags??[],grounded:true,providers:local.providers},{headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json({message:"Travel Agent is temporarily unavailable"},{status:503,headers:{"cache-control":"no-store"}})}
}
