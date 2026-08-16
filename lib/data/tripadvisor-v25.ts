import type { TripadvisorBundleV25,TripadvisorPlaceKindV25,TripadvisorPlaceV25 } from "@/lib/trip-builder/types-v25";

const BASE="https://api.content.tripadvisor.com/api/v1";
const text=(value:unknown)=>typeof value==="string"&&value.trim()?value.trim():null;
const idText=(value:unknown)=>typeof value==="string"||typeof value==="number"?String(value).trim():null;
const number=(value:unknown)=>Number.isFinite(Number(value))?Number(value):null;

type Address={address_string?:string;street1?:string;city?:string;country?:string};
type SearchRow={location_id?:string|number;name?:string;address_obj?:Address};
type SearchPayload={data?:SearchRow[]};
type DetailsPayload={
 location_id?:string|number;name?:string;description?:string;rating?:string|number;num_reviews?:string|number;web_url?:string;rating_image_url?:string;
 address_obj?:Address;
 ranking_data?:{ranking?:string|number;ranking_string?:string};
};
type PhotoPayload={data?:Array<{images?:{original?:{url?:string};large?:{url?:string};medium?:{url?:string}}}>};
type Category="hotels"|"attractions"|"restaurants"|"geos";

function addressOf(row:{address_obj?:Address}){
 const a=row.address_obj,direct=text(a?.address_string);if(direct)return direct;
 const joined=[text(a?.street1),text(a?.city),text(a?.country)].filter((value):value is string=>Boolean(value)).join(", ");return joined||null;
}
function referer(){const raw=process.env.TRIPADVISOR_REFERER||process.env.NEXT_PUBLIC_SITE_URL||"https://travel-ai-navy-eight.vercel.app";try{return new URL(raw).origin}catch{return"https://travel-ai-navy-eight.vercel.app"}}
async function taFetch<T>(path:string,params:Record<string,string|number|undefined>,timeout=5500):Promise<T>{
 const key=process.env.TRIPADVISOR_API_KEY;if(!key)throw new Error("TRIPADVISOR_API_KEY missing");
 const url=new URL(`${BASE}${path}`);url.searchParams.set("key",key);for(const[k,v]of Object.entries(params))if(v!==undefined&&String(v)!=="")url.searchParams.set(k,String(v));
 const origin=referer(),response=await fetch(url,{cache:"no-store",headers:{accept:"application/json",referer:origin,origin},signal:AbortSignal.timeout(timeout)});
 if(!response.ok)throw new Error(`Tripadvisor ${response.status}`);return await response.json() as T;
}
async function search(query:string,category:Category,lat:number,lon:number,language:string,limit=6){
 const payload=await taFetch<SearchPayload>("/location/search",{searchQuery:query,category,latLong:`${lat},${lon}`,radius:45,radiusUnit:"km",language});
 return(payload.data??[]).filter(row=>Boolean(idText(row.location_id))&&Boolean(text(row.name))).slice(0,Math.max(1,Math.min(10,limit)));
}
async function details(locationId:string,language:string){return await taFetch<DetailsPayload>(`/location/${encodeURIComponent(locationId)}/details`,{language,currency:"EUR"});}
async function photo(locationId:string,language:string){try{const payload=await taFetch<PhotoPayload>(`/location/${encodeURIComponent(locationId)}/photos`,{language,limit:1},4300),item=payload.data?.[0];return text(item?.images?.large?.url)??text(item?.images?.original?.url)??text(item?.images?.medium?.url)}catch{return null}}
function rankingOf(payload:DetailsPayload){const direct=number(payload.ranking_data?.ranking);if(direct!=null)return Math.max(1,Math.round(direct));const label=text(payload.ranking_data?.ranking_string),m=label?.match(/#?\s*(\d+)/);return m?Number(m[1]):null}
function sourceMonth(){return new Intl.DateTimeFormat("en-US",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date())}
function basic(row:SearchRow,kind:TripadvisorPlaceKindV25):TripadvisorPlaceV25{return{locationId:idText(row.location_id)??"",kind,name:text(row.name)??"Tripadvisor place",description:null,rating:null,reviewCount:null,ranking:null,rankingLabel:null,address:addressOf(row),webUrl:null,imageUrl:null,ratingImageUrl:null,sourceMonth:sourceMonth()}}
async function hydrate(row:SearchRow,kind:TripadvisorPlaceKindV25,language:string,withPhoto:boolean):Promise<TripadvisorPlaceV25>{
 const fallback=basic(row,kind);try{const d=await details(fallback.locationId,language),imageUrl=withPhoto?await photo(fallback.locationId,language):null;return{...fallback,name:text(d.name)??fallback.name,description:text(d.description),rating:number(d.rating),reviewCount:number(d.num_reviews),ranking:rankingOf(d),rankingLabel:text(d.ranking_data?.ranking_string),address:addressOf(d)??fallback.address,webUrl:text(d.web_url),imageUrl,ratingImageUrl:text(d.rating_image_url)}}catch{return fallback}}
function rank(items:TripadvisorPlaceV25[]){return[...items].sort((a,b)=>{if(a.ranking!=null&&b.ranking!=null)return a.ranking-b.ranking;if(a.ranking!=null)return-1;if(b.ranking!=null)return 1;if((b.rating??0)!==(a.rating??0))return(b.rating??0)-(a.rating??0);return(b.reviewCount??0)-(a.reviewCount??0)})}
async function hydrateGroup(rows:SearchRow[],kind:TripadvisorPlaceKindV25,language:string,photoCount:number,limit:number){const selected=rows.slice(0,limit),out=await Promise.all(selected.map((row,index)=>hydrate(row,kind,language,index<photoCount)));return rank(out)}

export async function getTripadvisorBundleV25(args:{destinationName:string;hotelName:string|null;latitude:number;longitude:number;isSummer:boolean;language:"el"|"en"}):Promise<TripadvisorBundleV25>{
 const attribution="Tripadvisor" as const,month=sourceMonth(),language=args.language==="el"?"el":"en";
 if(!process.env.TRIPADVISOR_API_KEY)return{status:"not-configured",attribution,sourceMonth:month,hotel:null,places:[],museums:[],restaurants:[],nightlife:[],beaches:[],note:"Tripadvisor Content API key is not configured; no Tripadvisor ranking is invented."};
 try{
  const hotelPromise=args.hotelName?search(args.hotelName,"hotels",args.latitude,args.longitude,language,3):Promise.resolve([]),[hotelRows,placeRows,museumRows,restaurantRows,nightRows,beachRows]=await Promise.all([
   hotelPromise,
   search(`${args.destinationName} attractions`,"attractions",args.latitude,args.longitude,language,6),
   search(`${args.destinationName} museums`,"attractions",args.latitude,args.longitude,language,5),
   search(`${args.destinationName} restaurants`,"restaurants",args.latitude,args.longitude,language,7),
   search(`${args.destinationName} bars nightlife`,"restaurants",args.latitude,args.longitude,language,5),
   args.isSummer?search(`${args.destinationName} beaches`,"attractions",args.latitude,args.longitude,language,6):Promise.resolve([]),
  ]);
  const[hotel,places,museums,restaurants,nightlife,beaches]=await Promise.all([
   hotelRows[0]?hydrate(hotelRows[0],"hotel",language,true):Promise.resolve(null),
   hydrateGroup(placeRows,"place",language,3,5),hydrateGroup(museumRows,"museum",language,2,4),hydrateGroup(restaurantRows,"restaurant",language,2,6),hydrateGroup(nightRows,"nightlife",language,1,4),hydrateGroup(beachRows,"beach",language,3,5),
  ]);
  return{status:"live",attribution,sourceMonth:month,hotel,places,museums,restaurants,nightlife,beaches,note:`Live Tripadvisor Content API results. Popularity rankings, when shown, are cited as of ${month}. Content is not persisted.`};
 }catch{return{status:"unavailable",attribution,sourceMonth:month,hotel:null,places:[],museums:[],restaurants:[],nightlife:[],beaches:[],note:"Tripadvisor was unavailable for this request; the app does not substitute invented rankings."}}
}
