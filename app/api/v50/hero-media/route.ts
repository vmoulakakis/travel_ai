import { NextResponse } from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

type Row={
  id:string;
  location_label:string|null;
  hero_image_url:string|null;
  property_count:number|null;
  min_price:number|null;
  currency:string|null;
  centroid_latitude:number|null;
  centroid_longitude:number|null;
};

const base=()=>process.env.NEXT_PUBLIC_SUPABASE_URL??process.env.SUPABASE_URL??"https://bgvgstpoypqbjnemqcqp.supabase.co";
const key=()=>process.env.SUPABASE_SERVICE_ROLE_KEY??"";

export async function GET(){
  const serviceKey=key();
  if(!serviceKey)return NextResponse.json({items:[]},{headers:{"cache-control":"public, max-age=60"}});
  try{
    const url=new URL("/rest/v1/destination_supply_signals",base());
    url.searchParams.set("select","id,location_label,hero_image_url,property_count,min_price,currency,centroid_latitude,centroid_longitude");
    url.searchParams.set("hero_image_url","not.is.null");
    url.searchParams.set("order","property_count.desc.nullslast");
    url.searchParams.set("limit","18");
    const response=await fetch(url,{headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(7000)});
    if(!response.ok)throw new Error("hero_media_unavailable");
    const rows=await response.json() as Row[];
    const seen=new Set<string>();
    const items=rows.filter(row=>{
      const key=(row.location_label??"").trim().toLowerCase();
      if(!key||!row.hero_image_url||seen.has(key))return false;
      seen.add(key);return true;
    }).slice(0,12).map(row=>({
      id:row.id,
      location:row.location_label,
      imageUrl:row.hero_image_url,
      propertyCount:row.property_count??0,
      minPrice:row.min_price??null,
      currency:row.currency??"EUR",
      latitude:row.centroid_latitude,
      longitude:row.centroid_longitude
    }));
    return NextResponse.json({items},{headers:{"cache-control":"public, s-maxage=300, stale-while-revalidate=1800","x-travel-media":"real-supply-assets"}});
  }catch{
    return NextResponse.json({items:[]},{status:200,headers:{"cache-control":"public, max-age=60"}});
  }
}
