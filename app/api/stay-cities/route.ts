import { NextResponse } from "next/server";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";
import { buildInventoryDestinationOptionsV15,loadActiveStayCitiesV15 } from "@/lib/data/stay-cities-v15";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(request:Request){
 try{
  const lang=new URL(request.url).searchParams.get("lang")==="en"?"en":"el";
  const[cities,catalog]=await Promise.all([loadActiveStayCitiesV15(),loadV8DestinationCatalog()]);
  const options=buildInventoryDestinationOptionsV15(cities,catalog.filter(destination=>destination.countryCode==="GR"),lang);
  return NextResponse.json({version:15,source:"active-stay-inventory",count:options.length,cities:options},{headers:{"cache-control":"public, max-age=120, s-maxage=600, stale-while-revalidate=1800","x-content-type-options":"nosniff"}});
 }catch{
  return NextResponse.json({version:15,source:"unavailable",count:0,cities:[]},{status:503,headers:{"cache-control":"no-store"}});
 }
}
