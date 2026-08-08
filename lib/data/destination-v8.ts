import type { AffiliateOffer } from "@/lib/decision/types";
import { V8_DIMENSIONS, type V8Destination, type V8StayOffer } from "@/lib/decision/v8-types";

const CATALOG_URL=process.env.SUPABASE_DESTINATION_CATALOG_V8_URL??"https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/destination-catalog-v8";
const STAYS_URL=process.env.SUPABASE_DESTINATION_STAYS_V8_URL??"https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/destination-stays-v8";
const text=(v:unknown)=>typeof v==="string"&&v.trim()?v.trim():null;
const num=(v:unknown)=>Number.isFinite(Number(v))?Number(v):null;
function vector(v:unknown){if(Array.isArray(v))return v.map(Number).filter(Number.isFinite).slice(0,16);if(typeof v!=="string")return[];return v.replace(/^\[/,"").replace(/\]$/,"").split(",").map(Number).filter(Number.isFinite).slice(0,16)}
function cleanHtml(v:string|null){return v?v.replace(/<[^>]*>/g," ").replace(/&nbsp;/gi," ").replace(/\s+/g," ").trim():null}
function appHeaders(){const secret=process.env.SUPABASE_INGEST_SECRET;if(!secret)throw new Error("Server matching secret not configured");return{"x-app-secret":secret,"user-agent":"travel-ai-v8/1.0"}}

function mapDestination(row:Record<string,unknown>):V8Destination|null{
 const slug=text(row.slug),nameEl=text(row.name_el),nameEn=text(row.name_en),countryCode=text(row.country_code),countryEl=text(row.country_el),countryEn=text(row.country_en),lat=num(row.latitude),lon=num(row.longitude),vec=vector(row.semantic_vector);
 if(!slug||!nameEl||!nameEn||!countryCode||!countryEl||!countryEn||lat==null||lon==null||vec.length!==16)return null;
 const tags=Array.isArray(row.tags)?row.tags.filter((x):x is typeof V8_DIMENSIONS[number]=>typeof x==="string"&&(V8_DIMENSIONS as readonly string[]).includes(x)):[];
 const monthFit=Array.isArray(row.month_fit)?row.month_fit.map(Number).filter(Number.isFinite).slice(0,12):[];
 if(monthFit.length!==12)return null;
 const cost=Math.max(1,Math.min(5,Math.round(Number(row.cost_tier??3)))) as 1|2|3|4|5;
 const crowd=Math.max(1,Math.min(5,Math.round(Number(row.crowd_level??3)))) as 1|2|3|4|5;
 return{slug,nameEl,nameEn,countryCode,countryEl,countryEn,latitude:lat,longitude:lon,regionGroup:text(row.region_group)??countryCode,aliases:Array.isArray(row.aliases)?row.aliases.filter((x):x is string=>typeof x==="string"):[],tags,vector:vec,monthFit,idealNightsMin:Number(row.ideal_nights_min??2),idealNightsMax:Number(row.ideal_nights_max??4),costTier:cost,effortAthens:text(row.effort_athens)??"medium-flight",effortThessaloniki:text(row.effort_thessaloniki)??"medium-flight",directFromAthens:Boolean(row.direct_from_athens),routeConfidence:Math.max(0,Math.min(1,Number(row.route_confidence??.6))),travelerFit:row.traveler_fit&&typeof row.traveler_fit==="object"?row.traveler_fit as Record<string,number>:{},crowdLevel:crowd,hotelRadiusKm:Number(row.hotel_radius_km??35),knowledgeSource:text(row.knowledge_source)??"curated-v8",seasonProfile:text(row.season_profile)??"city_cont"};
}

export async function loadV8DestinationCatalog():Promise<V8Destination[]>{
 const response=await fetch(CATALOG_URL,{cache:"no-store",headers:appHeaders(),signal:AbortSignal.timeout(4500)});
 if(!response.ok)throw new Error(`Destination catalog ${response.status}`);
 const payload=await response.json() as {destinations?:Array<Record<string,unknown>>};
 const rows=(payload.destinations??[]).map(mapDestination).filter((x):x is V8Destination=>Boolean(x));
 if(rows.length<10)throw new Error("Destination catalog is unexpectedly small");
 return rows;
}

function mapOffer(row:Record<string,unknown>):V8StayOffer|null{
 const trackingUrl=text(row.tracking_url),sourceProductId=text(row.source_product_id),propertyName=text(row.property_name);
 if(!trackingUrl||!sourceProductId||!propertyName||!trackingUrl.startsWith("https://go.linkwi.se/"))return null;
 const base:AffiliateOffer={sourceProductId,propertyName,description:cleanHtml(text(row.description)),category:text(row.source_category),programId:text(row.program_id),trackingUrl,imageUrl:text(row.image_url),thumbUrl:text(row.thumb_url),availability:text(row.availability),validFrom:text(row.valid_from),validTo:text(row.valid_to),currency:text(row.currency),price:num(row.price),fullPrice:num(row.full_price),discount:num(row.discount),demandSignal:num(row.demand_proxy),starLevel:null};
 const starMatch=propertyName.match(/(?:^|\s)([1-5])\s*\*/);if(starMatch)base.starLevel=Number(starMatch[1]);
 return{...base,city:text(row.city),address:text(row.address),distanceKm:num(row.distance_km)};
}

export async function loadV8StayOffers(slug:string,startDate:string,endDate:string,limit=18):Promise<V8StayOffer[]>{
 const url=new URL(STAYS_URL);url.searchParams.set("slug",slug);url.searchParams.set("start_date",startDate);url.searchParams.set("end_date",endDate);url.searchParams.set("limit",String(Math.max(1,Math.min(30,limit))));
 const response=await fetch(url,{cache:"no-store",headers:appHeaders(),signal:AbortSignal.timeout(4500)});if(!response.ok)throw new Error(`Destination stays ${response.status}`);
 const payload=await response.json() as {offers?:Array<Record<string,unknown>>};return(payload.offers??[]).map(mapOffer).filter((x):x is V8StayOffer=>Boolean(x));
}
