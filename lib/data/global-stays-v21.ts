import type { V8StayOffer } from "@/lib/decision/v8-types";

const GLOBAL_STAYS_URL=process.env.SUPABASE_GLOBAL_STAYS_V21_URL??"https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/global-stays-v21";
const text=(value:unknown)=>typeof value==="string"&&value.trim()?value.trim():null;
const num=(value:unknown)=>Number.isFinite(Number(value))?Number(value):null;
const vector=(value:unknown)=>typeof value==="string"?value.replace(/^\[/,"").replace(/\]$/,"").split(",").map(Number).filter(Number.isFinite).slice(0,24):Array.isArray(value)?value.map(Number).filter(Number.isFinite).slice(0,24):[];

export interface GlobalStayCandidateV21 extends V8StayOffer{
  destinationSlug:string;
  semanticVector:number[];
  semanticConfidence:number|null;
}

type Payload={stays?:Array<Record<string,unknown>>};

export async function loadGlobalStayCandidatesV21(startDate:string,endDate:string,perDestination=40):Promise<GlobalStayCandidateV21[]>{
  const secret=process.env.SUPABASE_INGEST_SECRET;
  if(!secret)throw new Error("Global stay retrieval secret unavailable");
  const url=new URL(GLOBAL_STAYS_URL);url.searchParams.set("start_date",startDate);url.searchParams.set("end_date",endDate);url.searchParams.set("per_destination",String(Math.max(1,Math.min(60,perDestination))));
  const response=await fetch(url,{cache:"no-store",headers:{"user-agent":"travel-guru/1.0","x-app-secret":secret},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error(`Global stay retrieval ${response.status}`);
  const payload=await response.json() as Payload;
  const rows=payload.stays??[],result:GlobalStayCandidateV21[]=[];
  for(const row of rows){
    const destinationSlug=text(row.destination_slug),sourceProductId=text(row.source_product_id),propertyName=text(row.property_name),trackingUrl=text(row.tracking_url);
    if(!destinationSlug||!sourceProductId||!propertyName||!trackingUrl||!trackingUrl.startsWith("https://go.linkwi.se/")||!trackingUrl.includes("/CD104/"))continue;
    const raw=row.raw&&typeof row.raw==="object"&&!Array.isArray(row.raw)?row.raw as Record<string,unknown>:{};
    const starMatch=propertyName.match(/(?:^|\s)([1-5])\s*\*/);
    result.push({
      destinationSlug,sourceProductId,propertyName,trackingUrl,
      description:text(row.description),category:text(row.source_category),programId:text(row.program_id),imageUrl:text(row.image_url),thumbUrl:text(row.thumb_url),
      inStock:typeof row.in_stock==="boolean"?row.in_stock:null,availability:text(row.availability),validFrom:text(row.valid_from),validTo:text(row.valid_to),currency:text(row.currency),price:num(row.price),fullPrice:num(row.full_price),discount:num(row.discount),demandSignal:num(row.demand_proxy),starLevel:starMatch?Number(starMatch[1]):null,
      city:text(row.city),address:text(row.address),distanceKm:num(row.distance_km),latitude:num(raw.latitude),longitude:num(raw.longitude),raw,
      semanticVector:vector(row.semantic_vector),semanticConfidence:num(row.semantic_confidence),
    });
  }
  return result;
}
