import { NextResponse } from "next/server";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";

export const runtime="nodejs";
export const dynamic="force-dynamic";

type StayPlace={
 id:string;
 property_name:string|null;
 location_label:string|null;
 address:string|null;
 city_raw:string|null;
 country_hint:string|null;
 latitude:number|null;
 longitude:number|null;
 category:string|null;
 hero_image_url:string|null;
 offer_count:number|null;
 min_price:number|null;
 currency:string|null;
 demand_score:number|null;
};
type OfferRow={
 source_product_id:string;
 place_id:string;
 property_name:string|null;
 location_label:string|null;
 tracking_url:string|null;
 image_url:string|null;
 thumb_url:string|null;
 in_stock:boolean|null;
 availability:string|null;
 valid_to:string|null;
 on_sale:boolean|null;
 currency:string|null;
 price:number|null;
 full_price:number|null;
 discount:number|null;
 demand_proxy:number|null;
 stay_places:StayPlace|null;
};
type Product={
 productId:string;placeId:string;name:string;location:string;address:string;latitude:number;longitude:number;
 category:string;imageUrl:string|null;price:number|null;fullPrice:number|null;discount:number|null;currency:string;
 onSale:boolean;availability:string;validTo:string|null;demandScore:number|null;trackingUrl:string;destinationSlug:string|null;
};

const base=()=>process.env.NEXT_PUBLIC_SUPABASE_URL??process.env.SUPABASE_URL??"https://bgvgstpoypqbjnemqcqp.supabase.co";
const key=()=>process.env.SUPABASE_SERVICE_ROLE_KEY??"";
const txt=(v:unknown)=>typeof v==="string"?v.trim():"";
const num=(v:unknown)=>Number.isFinite(Number(v))?Number(v):null;
const norm=(v:string)=>v.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/[^a-zα-ω0-9]+/gi," ").trim();

async function page(offset:number,limit:number){
 const serviceKey=key();if(!serviceKey)throw new Error("service_role_missing");
 const url=new URL("/rest/v1/stay_offers",base());
 url.searchParams.set("select","source_product_id,place_id,property_name,location_label,tracking_url,image_url,thumb_url,in_stock,availability,valid_to,on_sale,currency,price,full_price,discount,demand_proxy,stay_places!inner(id,property_name,location_label,address,city_raw,country_hint,latitude,longitude,category,hero_image_url,offer_count,min_price,currency,demand_score)");
 url.searchParams.set("tracking_url","not.is.null");
 url.searchParams.set("order","demand_proxy.desc.nullslast,price.asc.nullslast");
 url.searchParams.set("limit",String(limit));
 url.searchParams.set("offset",String(offset));
 const response=await fetch(url,{headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(8500)});
 if(!response.ok)throw new Error(`stay_map_${response.status}`);
 return await response.json() as OfferRow[];
}

export async function GET(request:Request){
 try{
  const requested=Number(new URL(request.url).searchParams.get("limit")??1800),limit=Math.max(100,Math.min(2000,Number.isFinite(requested)?Math.round(requested):1800));
  if(!key()){
   const fallbackUrl=new URL(process.env.SUPABASE_STAY_PRODUCT_MAP_V32_URL??"https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/stay-product-map-v32");
   fallbackUrl.searchParams.set("limit","300");
   const fallback=await fetch(fallbackUrl,{headers:{accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(8000)});
   if(!fallback.ok)throw new Error("fallback_map_unavailable");
   const payload=await fallback.json() as Record<string,unknown>;
   return NextResponse.json({...payload,version:50,fullUniverse:false,demandLayer:{status:"disabled",reason:"Demand forecasting is not used for public ranking; results are based on verified inventory and trip-fit criteria."}},{headers:{"cache-control":"private, max-age=0","x-content-type-options":"nosniff","x-travel-map":"v50-prototype-fallback"}});
  }
  const catalog=await loadV8DestinationCatalog().catch(()=>[]);
  const destinationKeys=catalog.flatMap(d=>[d.nameEl,d.nameEn,...d.aliases].map(name=>({name:norm(name),slug:d.slug}))).filter(x=>x.name.length>=3).sort((a,b)=>b.name.length-a.name.length);
  const rows:OfferRow[]=[];
  for(let offset=0;offset<3000&&rows.length<Math.max(limit*2,2000);offset+=1000){
   const batch=await page(offset,1000);rows.push(...batch);if(batch.length<1000)break;
  }
  const seen=new Set<string>(),today=new Date().toISOString().slice(0,10),products:Product[]=[];
  for(const row of rows){
   const place=row.stay_places,lat=num(place?.latitude),lon=num(place?.longitude),placeId=txt(row.place_id||place?.id),trackingUrl=txt(row.tracking_url),validTo=txt(row.valid_to);
   if(row.in_stock===false||(validTo&&validTo<today)||!placeId||seen.has(placeId)||lat==null||lon==null||!trackingUrl)continue;
   if(lat<34||lat>42.5||lon<19||lon>30)continue;
   seen.add(placeId);
   const locationText=norm([txt(row.location_label),txt(place?.location_label),txt(place?.city_raw),txt(place?.address)].filter(Boolean).join(" "));
   const destinationSlug=destinationKeys.find(x=>locationText.includes(x.name))?.slug??null;
   products.push({
    productId:txt(row.source_product_id),placeId,name:txt(row.property_name)||txt(place?.property_name),
    location:txt(row.location_label)||txt(place?.location_label)||txt(place?.city_raw),
    address:txt(place?.address),latitude:lat,longitude:lon,category:txt(place?.category),
    imageUrl:txt(row.image_url)||txt(row.thumb_url)||txt(place?.hero_image_url)||null,
    price:num(row.price)??num(place?.min_price),fullPrice:num(row.full_price),discount:num(row.discount),
    currency:txt(row.currency)||txt(place?.currency)||"EUR",onSale:row.on_sale===true,
    availability:row.in_stock===true?"confirmed-active":txt(row.availability)||"valid-window-stock-unknown",
    validTo:validTo||null,demandScore:num(row.demand_proxy)??num(place?.demand_score),trackingUrl,destinationSlug
   });
   if(products.length>=limit)break;
  }
  return NextResponse.json({
   version:50,
   source:"supabase-stay-offers",
   generatedAt:new Date().toISOString(),
   count:products.length,
   locationCount:new Set(products.map(x=>x.location).filter(Boolean)).size,
   demandLayer:{status:"disabled",reason:"Demand forecasting is not used for public ranking; offer ranking relies on verified inventory and trip-fit criteria."},
   products
  },{headers:{"cache-control":"private, max-age=0","x-content-type-options":"nosniff","x-travel-map":"v50-prototype"}});
 }catch(error){
  return NextResponse.json({version:50,source:"temporarily-unavailable",generatedAt:new Date().toISOString(),count:0,locationCount:0,products:[],degraded:true,detail:process.env.NODE_ENV==="development"&&error instanceof Error?error.message:undefined},{status:200,headers:{"cache-control":"public, max-age=30","x-travel-map":"degraded"}});
 }
}
