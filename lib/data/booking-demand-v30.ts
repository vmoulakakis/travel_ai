import type { BookingCitySignalV30 } from "@/lib/ai/city-map-ranking-v30";

const BASE=process.env.BOOKING_DEMAND_BASE_URL??"https://demandapi.booking.com/3.2";
const token=()=>process.env.BOOKING_DEMAND_API_KEY?.trim()||"";
const affiliate=()=>process.env.BOOKING_AFFILIATE_ID?.trim()||"";
const iso=(date:Date)=>date.toISOString().slice(0,10);
const addDays=(date:Date,days:number)=>new Date(date.getTime()+days*86400000);
const finite=(value:unknown)=>Number.isFinite(Number(value))?Number(value):null;

type JsonObject=Record<string,unknown>;
function object(value:unknown):JsonObject|null{return value&&typeof value==="object"&&!Array.isArray(value)?value as JsonObject:null}
function array(value:unknown):unknown[]{return Array.isArray(value)?value:[]}
function readPath(row:JsonObject,path:string[]){let current:unknown=row;for(const key of path){const next=object(current);if(!next)return null;current=next[key]}return current}
function firstNumber(row:JsonObject,paths:string[][]){for(const path of paths){const value=finite(readPath(row,path));if(value!=null)return value}return null}
function accommodationId(row:JsonObject){return firstNumber(row,[["id"],["accommodation"],["accommodation","id"],["property","id"]])}
function scoreOf(row:JsonObject){return firstNumber(row,[["score"],["overall"],["overall","score"],["review_score"],["review","score"],["reviews","score"],["average_score"],["rating","score"]])}
function reviewCountOf(row:JsonObject){return firstNumber(row,[["number_of_reviews"],["review_count"],["reviews","count"],["overall","number_of_reviews"],["score","number_of_reviews"]])??0}

async function bookingPost(path:string,body:JsonObject,timeout=6500){
 const key=token(),aid=affiliate();if(!key||!aid)throw new Error("Booking.com Demand API credentials missing");
 const response=await fetch(`${BASE}${path}`,{method:"POST",cache:"no-store",headers:{authorization:`Bearer ${key}`,"x-affiliate-id":aid,"content-type":"application/json",accept:"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(timeout)});
 if(!response.ok)throw new Error(`Booking.com Demand API ${response.status}`);
 return await response.json() as JsonObject;
}

export function bookingDemandConfiguredV30(){return Boolean(token()&&affiliate())}

export async function getBookingCitySignalV30(args:{latitude:number;longitude:number;radiusKm?:number;language:"el"|"en"}):Promise<BookingCitySignalV30>{
 const today=new Date(),sourceDate=iso(today);
 if(!bookingDemandConfiguredV30())return{status:"not-configured",reviewScore10:null,reviewCount:0,accommodationCount:0,sourceDate};
 const checkin=iso(addDays(today,30)),checkout=iso(addDays(today,32)),radius=Math.max(3,Math.min(50,Math.round(args.radiusKm??25)));
 try{
  const search=await bookingPost("/accommodations/search",{coordinates:{latitude:args.latitude,longitude:args.longitude,radius},booker:{country:"gr",platform:"desktop",travel_purpose:"leisure"},currency:"EUR",checkin,checkout,guests:{number_of_adults:2,number_of_rooms:1},sort:{by:"review_score",direction:"descending"},rows:10}),rows=array(search.data).map(object).filter((row):row is JsonObject=>Boolean(row)),ids=rows.map(accommodationId).filter((value):value is number=>value!=null).slice(0,10);
  if(!ids.length)return{status:"live",reviewScore10:null,reviewCount:0,accommodationCount:rows.length,sourceDate};
  let reviewScore10:number|null=null,reviewCount=0;
  try{
   const scores=await bookingPost("/accommodations/reviews/scores",{accommodations:ids,languages:[args.language==="el"?"el":"en-gb"]}),scoreRows=array(scores.data).map(object).filter((row):row is JsonObject=>Boolean(row)),rated=scoreRows.map(row=>({score:scoreOf(row),count:reviewCountOf(row)})).filter(item=>item.score!=null&&item.score>=0&&item.score<=10),totalWeight=rated.reduce((sum,item)=>sum+Math.max(1,item.count),0);
   if(rated.length)reviewScore10=Number((rated.reduce((sum,item)=>sum+(item.score??0)*Math.max(1,item.count),0)/Math.max(1,totalWeight)).toFixed(2));
   reviewCount=rated.reduce((sum,item)=>sum+item.count,0);
  }catch{/* Search availability stays useful even if review-scores permission is not granted. */}
  return{status:"live",reviewScore10,reviewCount,accommodationCount:rows.length,sourceDate};
 }catch{return{status:"unavailable",reviewScore10:null,reviewCount:0,accommodationCount:0,sourceDate}}
}


const textValue=(value:unknown)=>typeof value==="string"?value.trim():"";
const normName=(value:string)=>value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9α-ω]+/gi," ").trim();
function bookingNameFit(expected:string,row:JsonObject){
 const candidate=textValue(readPath(row,["name"]))||textValue(readPath(row,["accommodation","name"]))||textValue(readPath(row,["property","name"]));
 const a=new Set(normName(expected).split(/\s+/).filter(x=>x.length>1)),b=new Set(normName(candidate).split(/\s+/).filter(x=>x.length>1));
 if(!a.size||!b.size)return 0;
 const common=[...a].filter(x=>b.has(x)).length;
 return Math.max(common/Math.min(a.size,b.size),common/new Set([...a,...b]).size);
}

export async function getBookingStayRatingV68(args:{propertyName:string;latitude:number|null;longitude:number|null;language:"el"|"en"}){
 if(!bookingDemandConfiguredV30()||args.latitude==null||args.longitude==null)return null;
 const today=new Date(),checkin=iso(addDays(today,30)),checkout=iso(addDays(today,32));
 try{
  const search=await bookingPost("/accommodations/search",{coordinates:{latitude:args.latitude,longitude:args.longitude,radius:8},booker:{country:"gr",platform:"desktop",travel_purpose:"leisure"},currency:"EUR",checkin,checkout,guests:{number_of_adults:2,number_of_rooms:1},sort:{by:"review_score",direction:"descending"},rows:20});
  const rows=array(search.data).map(object).filter((row):row is JsonObject=>Boolean(row));
  let best:JsonObject|null=null,bestFit=.62;
  for(const row of rows){const fit=bookingNameFit(args.propertyName,row);if(fit>bestFit){best=row;bestFit=fit}}
  if(!best)return null;
  const id=accommodationId(best);if(id==null)return null;
  const scores=await bookingPost("/accommodations/reviews/scores",{accommodations:[id],languages:[args.language==="el"?"el":"en-gb"]});
  const row=array(scores.data).map(object).find((x):x is JsonObject=>Boolean(x));if(!row)return null;
  const score=scoreOf(row),reviewCount=reviewCountOf(row);
  if(score==null||score<0||score>10)return null;
  return{rating:score/2,reviewCount:Math.max(0,Math.round(reviewCount)),matchConfidence:bestFit};
 }catch{return null}
}
