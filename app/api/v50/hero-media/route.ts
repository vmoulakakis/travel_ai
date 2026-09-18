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

type PublicStay={
  productId?:string;
  placeId?:string;
  name?:string;
  location?:string;
  imageUrl?:string|null;
  price?:number|null;
  currency?:string|null;
  latitude?:number|null;
  longitude?:number|null;
};

const base=()=>process.env.NEXT_PUBLIC_SUPABASE_URL??process.env.SUPABASE_URL??"https://bgvgstpoypqbjnemqcqp.supabase.co";
const key=()=>process.env.SUPABASE_SERVICE_ROLE_KEY??"";

function normalize(items:PublicStay[]){
  const seen=new Set<string>();
  return items.filter(item=>{
    const location=(item.location??"").trim(),image=(item.imageUrl??"").trim(),k=location.toLowerCase();
    if(!location||!image||seen.has(k))return false;
    seen.add(k);
    return true;
  }).slice(0,12).map((item,index)=>({
    id:item.placeId??item.productId??`fallback-${index}`,
    location:item.location??"",
    imageUrl:item.imageUrl!,
    propertyCount:0,
    minPrice:item.price??null,
    currency:item.currency??"EUR",
    latitude:item.latitude??null,
    longitude:item.longitude??null
  }));
}

async function fallbackHeroMedia(){
  const url=new URL(process.env.SUPABASE_STAY_PRODUCT_MAP_V32_URL??"https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/stay-product-map-v32");
  url.searchParams.set("limit","160");
  const response=await fetch(url,{headers:{accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(7000)});
  if(!response.ok)return[];
  const payload=await response.json() as {products?:PublicStay[]};
  return normalize(Array.isArray(payload.products)?payload.products:[]);
}

export async function GET(){
  const serviceKey=key();
  if(serviceKey){
    try{
      const url=new URL("/rest/v1/destination_supply_signals",base());
      url.searchParams.set("select","id,location_label,hero_image_url,property_count,min_price,currency,centroid_latitude,centroid_longitude");
      url.searchParams.set("hero_image_url","not.is.null");
      url.searchParams.set("order","property_count.desc.nullslast");
      url.searchParams.set("limit","18");
      const response=await fetch(url,{headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(7000)});
      if(response.ok){
        const rows=await response.json() as Row[];
        const seen=new Set<string>();
        const items=rows.filter(row=>{
          const k=(row.location_label??"").trim().toLowerCase();
          if(!k||!row.hero_image_url||seen.has(k))return false;
          seen.add(k);
          return true;
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
        if(items.length){
          return NextResponse.json({items},{headers:{"cache-control":"public, s-maxage=300, stale-while-revalidate=1800","x-travel-media":"real-supply-assets"}});
        }
      }
    }catch{}
  }
  const items=await fallbackHeroMedia().catch(()=>[]);
  return NextResponse.json({items,degraded:!items.length},{status:200,headers:{"cache-control":"public, s-maxage=180, stale-while-revalidate=900","x-travel-media":items.length?"public-inventory-fallback":"degraded"}});
}
