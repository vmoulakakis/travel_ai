import type { V8Destination } from "@/lib/decision/v8-types";

const STAY_CITIES_URL=process.env.SUPABASE_STAY_CITIES_V15_URL??"https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/stay-cities-v15";

export interface ActiveStayCityV15{
 value:string;
 label:string;
 propertyCount:number;
 offerCount:number;
 minPrice:number|null;
 currency:string|null;
 freshestOfferAt:string|null;
}

export interface InventoryDestinationOptionV15{
 slug:string;
 value:string;
 label:string;
 propertyCount:number;
 offerCount:number;
 sourceCities:string[];
}

type DestinationIdentity=Pick<V8Destination,"slug"|"nameEl"|"nameEn"|"aliases">;
type EdgePayload={cities?:Array<Record<string,unknown>>};
const norm=(value:string)=>value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zα-ω0-9]+/gi," ").replace(/\s+/g," ").trim();
const text=(value:unknown)=>typeof value==="string"?value.trim():"";
const numberOr=(value:unknown,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;

export function isJunkStayCityV15(value:string){
 const n=norm(value);
 return !n||["all","unknown","n a","na","greece","ελλαδα"].includes(n)||n.includes("κρουαζι")||n.includes("cruise");
}

export function sanitizeStayCityRowsV15(rows:Array<Record<string,unknown>>):ActiveStayCityV15[]{
 const seen=new Map<string,ActiveStayCityV15>();
 for(const row of rows){
  const value=text(row.value??row.city),propertyCount=numberOr(row.propertyCount??row.property_count),offerCount=numberOr(row.offerCount??row.offer_count);
  if(isJunkStayCityV15(value)||propertyCount<1||offerCount<1)continue;
  const key=norm(value),candidate:ActiveStayCityV15={value,label:text(row.label)||value,propertyCount,offerCount,minPrice:row.minPrice==null&&row.min_price==null?null:numberOr(row.minPrice??row.min_price),currency:text(row.currency)||null,freshestOfferAt:text(row.freshestOfferAt??row.freshest_offer_at)||null};
  const current=seen.get(key);
  if(!current||candidate.propertyCount>current.propertyCount||(candidate.propertyCount===current.propertyCount&&candidate.offerCount>current.offerCount))seen.set(key,candidate);
 }
 return [...seen.values()].sort((a,b)=>b.propertyCount-a.propertyCount||b.offerCount-a.offerCount||a.label.localeCompare(b.label,"el"));
}

function matchIdentity(city:string,destinations:readonly DestinationIdentity[]){
 const pieces=[city,...city.split(",")].map(norm).filter(part=>part.length>=3);
 let best:{destination:DestinationIdentity;score:number}|null=null;
 for(const destination of destinations){
  const identities=[destination.slug,destination.nameEl,destination.nameEn,...destination.aliases].map(norm).filter(value=>value.length>=3);
  let score=0;
  for(const piece of pieces){
   for(const identity of identities){
    if(piece===identity)score=Math.max(score,100+identity.length);
    else if(piece.startsWith(`${identity} `)||piece.endsWith(` ${identity}`))score=Math.max(score,70+identity.length);
   }
  }
  if(score>0&&(!best||score>best.score))best={destination,score};
 }
 return best?.destination??null;
}

export function buildInventoryDestinationOptionsV15(cities:readonly ActiveStayCityV15[],destinations:readonly DestinationIdentity[],language:"el"|"en"="el"):InventoryDestinationOptionV15[]{
 const grouped=new Map<string,InventoryDestinationOptionV15>();
 for(const city of cities){
  const destination=matchIdentity(city.value,destinations);if(!destination)continue;
  const current=grouped.get(destination.slug),label=language==="en"?destination.nameEn:destination.nameEl;
  if(!current){grouped.set(destination.slug,{slug:destination.slug,value:destination.slug,label,propertyCount:city.propertyCount,offerCount:city.offerCount,sourceCities:[city.value]});continue}
  current.propertyCount=Math.max(current.propertyCount,city.propertyCount);
  current.offerCount=Math.max(current.offerCount,city.offerCount);
  if(!current.sourceCities.includes(city.value))current.sourceCities.push(city.value);
 }
 return [...grouped.values()].sort((a,b)=>b.propertyCount-a.propertyCount||b.offerCount-a.offerCount||a.label.localeCompare(b.label,language==="en"?"en":"el"));
}

export async function loadActiveStayCitiesV15(limit=220):Promise<ActiveStayCityV15[]>{
 const url=new URL(STAY_CITIES_URL);url.searchParams.set("limit",String(Math.max(1,Math.min(300,limit))));
 const response=await fetch(url,{cache:"no-store",headers:{"user-agent":"travel-guru/1.0"},signal:AbortSignal.timeout(6000)});
 if(!response.ok)throw new Error(`Stay city inventory ${response.status}`);
 const payload=await response.json() as EdgePayload;
 return sanitizeStayCityRowsV15(payload.cities??[]);
}
