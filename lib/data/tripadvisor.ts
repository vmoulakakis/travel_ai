import type { DestinationInsightsResponse, TripadvisorPlace, TripadvisorReview } from "@/lib/decision/types";

type UnknownRecord = Record<string, unknown>;
const API = "https://terra.tripadvisor.com/api";
const text=(v:unknown)=>typeof v==="string"&&v.trim()?v.trim():null;
const num=(v:unknown)=>Number.isFinite(Number(v))?Number(v):null;
const arr=(v:unknown)=>Array.isArray(v)?v:[];

function localized(value:unknown):string|null{
  if(typeof value==="string")return value;
  if(Array.isArray(value)){
    for(const item of value){if(item&&typeof item==="object"){const row=item as UnknownRecord;const x=text(row.value)??text(row.text)??text(row.name);if(x)return x;}}
  }
  return null;
}
function place(row:UnknownRecord,category:TripadvisorPlace["category"]):TripadvisorPlace|null{
  const id=text(row.id)??text(row.location_id)??text(row.locationId)??String(row.id??row.location_id??"");
  const name=localized(row.name)??localized(row.names)??text(row.display_name);
  if(!id||!name)return null;
  const rating=num(row.rating)??num(row.bubble_rating)??num((row.rating as UnknownRecord|undefined)?.rating);
  const reviewCount=num(row.review_count)??num(row.num_reviews)??num(row.reviewCount);
  const address=localized(row.address)??localized(row.addresses)??text(row.address_string);
  const distanceKm=num(row.distance)??num(row.distance_km);
  const photo=(arr(row.photos)[0] as UnknownRecord|undefined)??(row.photo as UnknownRecord|undefined);
  const imageUrl=photo?text(photo.url)??text(photo.image_url)??text((photo.images as UnknownRecord|undefined)?.large):null;
  return{id,name,category,rating,reviewCount,address,distanceKm,imageUrl,attribution:"Tripadvisor"};
}
function review(row:UnknownRecord):TripadvisorReview|null{
  const id=text(row.id)??text(row.review_id)??String(row.id??row.review_id??""); if(!id)return null;
  const user=(row.user&&typeof row.user==="object"?row.user as UnknownRecord:null)??(row.author&&typeof row.author==="object"?row.author as UnknownRecord:null);
  return{id,title:text(row.title),text:text(row.text),rating:num(row.rating)??num(row.overall_rating),publishedDate:text(row.published_date)??text(row.publishedDate)??text(row.created_at),author:user?text(user.username)??text(user.name):text(row.author_name)};
}
async function terra(path:string,key:string){const response=await fetch(`${API}${path}`,{headers:{"x-api-key":key,accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(5500)});if(!response.ok)throw new Error(`Tripadvisor Terra ${response.status}`);return response.json() as Promise<UnknownRecord>;}
async function nearby(lat:number,lon:number,category:"RESTAURANT"|"ATTRACTION",locale:string,key:string){const params=new URLSearchParams({lat:String(lat),lon:String(lon),radius:"15",unit:"KM",category,min_rating:"4",size:"6",sort:"rating,desc"});params.append("locale",locale);const payload=await terra(`/catalog/locations/nearby?${params.toString()}`,key);const rows=arr(payload.data??payload.results??payload.locations);return rows.map(x=>place(x as UnknownRecord,category)).filter((x):x is TripadvisorPlace=>Boolean(x)).slice(0,6);}
async function reviewsFor(ids:string[],language:string,key:string){const out:TripadvisorReview[]=[];for(const id of ids.slice(0,2)){try{const payload=await terra(`/locations/${encodeURIComponent(id)}/reviews?language=${encodeURIComponent(language)}&size=2&sort_by=HIGHEST_RATED`,key);for(const row of arr(payload.data??payload.reviews)){const r=review(row as UnknownRecord);if(r)out.push(r);}}catch{continue;}}return out.slice(0,4);}
export async function loadTripadvisorInsights(lat:number|null|undefined,lon:number|null|undefined,language:"el"|"en"="el"):Promise<DestinationInsightsResponse>{const key=process.env.TRIPADVISOR_TERRA_API_KEY;if(!key)return{source:"not-configured",restaurants:[],attractions:[],reviews:[],attributionRequired:true};if(lat==null||lon==null)return{source:"unavailable",restaurants:[],attractions:[],reviews:[],attributionRequired:true};try{const locale=language==="el"?"el-GR":"en-US";const [restaurants,attractions]=await Promise.all([nearby(lat,lon,"RESTAURANT",locale,key),nearby(lat,lon,"ATTRACTION",locale,key)]);const reviews=await reviewsFor([...attractions.map(x=>x.id),...restaurants.map(x=>x.id)],language,key);return{source:"tripadvisor-terra",restaurants,attractions,reviews,attributionRequired:true};}catch{return{source:"unavailable",restaurants:[],attractions:[],reviews:[],attributionRequired:true};}}
