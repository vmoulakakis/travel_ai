import type { V8StayOffer } from "@/lib/decision/v8-types";

const GLOBAL_STAYS_URL=process.env.SUPABASE_GLOBAL_STAYS_V37_URL??"https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/global-stays-v37";
const text=(v:unknown)=>typeof v==="string"&&v.trim()?v.trim():null;
const num=(v:unknown)=>Number.isFinite(Number(v))?Number(v):null;

export type V37DateFit="exact"|"overlap"|"provider_check";
export type V37MatchTier="core"|"nearby";
export interface GlobalStayV37 extends V8StayOffer{
  destinationSlug:string;
  dateFit:V37DateFit;
  matchTier:V37MatchTier;
}

type Payload={offers?:Array<Record<string,unknown>>};

function map(row:Record<string,unknown>):GlobalStayV37|null{
 const trackingUrl=text(row.tracking_url),sourceProductId=text(row.source_product_id),propertyName=text(row.property_name),destinationSlug=text(row.destination_slug);
 if(!trackingUrl||!sourceProductId||!propertyName||!destinationSlug||!trackingUrl.startsWith("https://go.linkwi.se/")||!trackingUrl.includes("/CD104/"))return null;
 const raw=row.raw&&typeof row.raw==="object"&&!Array.isArray(row.raw)?row.raw as Record<string,unknown>:{};
 return{
  destinationSlug,
  dateFit:(row.date_fit==="overlap"||row.date_fit==="provider_check"?row.date_fit:"exact") as V37DateFit,
  matchTier:(row.match_tier==="nearby"?"nearby":"core") as V37MatchTier,
  sourceProductId,propertyName,trackingUrl,
  description:text(row.description),category:text(row.source_category),programId:text(row.program_id),imageUrl:text(row.image_url),thumbUrl:text(row.thumb_url),
  availability:text(row.availability),validFrom:text(row.valid_from),validTo:text(row.valid_to),currency:text(row.currency),price:num(row.price),fullPrice:num(row.full_price),discount:num(row.discount),demandSignal:num(row.demand_proxy),starLevel:null,
  inStock:typeof row.in_stock==="boolean"?row.in_stock:null,city:text(row.city),address:text(row.address),distanceKm:num(row.distance_km),latitude:num(raw.latitude),longitude:num(raw.longitude),raw
 };
}

export async function loadGlobalStaysV37(startDate:string,endDate:string,mode:"exact"|"overlap"|"listed"="exact",relaxLocation=false,perDestination=80):Promise<GlobalStayV37[]>{
 const u=new URL(GLOBAL_STAYS_URL);u.searchParams.set("start_date",startDate);u.searchParams.set("end_date",endDate);u.searchParams.set("mode",mode);u.searchParams.set("relax_location",relaxLocation?"1":"0");u.searchParams.set("per_destination",String(Math.max(1,Math.min(120,perDestination))));
 let last:unknown;
 for(let attempt=0;attempt<2;attempt+=1){
  try{
   const r=await fetch(u,{cache:"no-store",headers:{"user-agent":"travel-ai-v37/1.0"},signal:AbortSignal.timeout(9000)});
   if(!r.ok){last=new Error(`global-stays-v37 ${r.status}`);if(r.status<500)break;continue;}
   const payload=await r.json() as Payload;
   return(payload.offers??[]).map(map).filter((x):x is GlobalStayV37=>Boolean(x));
  }catch(error){last=error;}
 }
 throw last instanceof Error?last:new Error("global stay inventory unavailable");
}
