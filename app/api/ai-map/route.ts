import { NextResponse } from "next/server";
import { buildCityMapRankingV30 } from "@/lib/ai/city-map-ranking-v30";
import { getBookingCitySignalV30 } from "@/lib/data/booking-demand-v30";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";
import { buildInventoryDestinationOptionsV15,loadActiveStayCitiesV15 } from "@/lib/data/stay-cities-v15";
import { getTripadvisorCitySignalV30 } from "@/lib/data/tripadvisor-v25";
import { webflowCorsHeadersV31,webflowPreflightV31 } from "@/lib/http/webflow-cors-v31";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function athensMonth(){return Number(new Intl.DateTimeFormat("en-GB",{month:"numeric",timeZone:"Europe/Athens"}).format(new Date()))}
function safeMonth(value:string|null){const parsed=Number(value);return Number.isInteger(parsed)&&parsed>=1&&parsed<=12?parsed:athensMonth()}

export function OPTIONS(request:Request){return webflowPreflightV31(request,"GET, OPTIONS")}

export async function GET(request:Request){
 const cors=webflowCorsHeadersV31(request,"GET, OPTIONS");
 try{
  const url=new URL(request.url),lang=url.searchParams.get("lang")==="en"?"en":"el",month=safeMonth(url.searchParams.get("month"));
  const[catalog,cities]=await Promise.all([loadV8DestinationCatalog(),loadActiveStayCitiesV15()]),greekCatalog=catalog.filter(destination=>destination.countryCode==="GR"),inventory=buildInventoryDestinationOptionsV15(cities,greekCatalog,lang),base=buildCityMapRankingV30({catalog:greekCatalog,inventory,month,limit:12}),tripadvisor=new Map(),booking=new Map(),externalTargets=base.slice(0,8);
  await Promise.all(externalTargets.map(async city=>{
   const destination=greekCatalog.find(item=>item.slug===city.slug);if(!destination)return;
   const[ta,bk]=await Promise.all([getTripadvisorCitySignalV30({destinationName:lang==="en"?destination.nameEn:destination.nameEl,latitude:destination.latitude,longitude:destination.longitude,language:lang}),getBookingCitySignalV30({latitude:destination.latitude,longitude:destination.longitude,radiusKm:destination.hotelRadiusKm,language:lang})]);
   tripadvisor.set(city.slug,ta);booking.set(city.slug,bk);
  }));
  const ranking=buildCityMapRankingV30({catalog:greekCatalog,inventory,month,tripadvisor,booking,limit:12});
  return NextResponse.json({version:30,generatedAt:new Date().toISOString(),month,language:lang,rankingModel:{base:"season 50% + verified stay inventory 24% + route confidence 16% + value/crowd 10%",external:"when live: base 72% + Tripadvisor review signal 16% + Booking.com review signal 12%; missing external sources are never invented"},sources:{tripadvisor:process.env.TRIPADVISOR_API_KEY?"configured":"not-configured",booking:process.env.BOOKING_DEMAND_API_KEY&&process.env.BOOKING_AFFILIATE_ID?"configured":"not-configured",stayInventory:"supabase-linkwise-live",map:"openstreetmap-compatible"},cities:ranking},{headers:{...cors,"cache-control":"public, max-age=300, s-maxage=86400, stale-while-revalidate=43200","x-content-type-options":"nosniff","x-travel-map-engine":"v30-location-truth"}});
 }catch(error){return NextResponse.json({version:30,error:"AI destination map is temporarily unavailable",detail:process.env.NODE_ENV==="development"&&error instanceof Error?error.message:undefined},{status:503,headers:{...cors,"cache-control":"no-store"}})}
}
