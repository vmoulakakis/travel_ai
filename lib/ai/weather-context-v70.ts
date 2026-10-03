import {getWeatherEvidence} from "@/lib/data/weather";
import type {AffiliateDestinationCandidate} from "@/lib/decision/types";
import type {TripRequest} from "@/lib/validation/trip";
import type {CandidateNodeV70,V70Locale} from "@/lib/ai/travel-intelligence-v70";

export type WeatherContextV70={
 key:string;source:string;sourceLabel:string;confidence:string;typical:boolean;
 temperatureMinC:number|null;temperatureMeanC:number|null;temperatureMaxC:number|null;
 precipitationMmDay:number|null;windKmh:number|null;sunSignal:number|null;summary:string;researchedAt:string;
};
function iso(date:Date){return date.toISOString().slice(0,10)}
export function defaultDiscoveryWindowV70(){
 const start=new Date();start.setUTCHours(0,0,0,0);
 const end=new Date(start.getTime()+7*86400000);
 return{startDate:iso(start),endDate:iso(end)};
}
function evidenceTrip(startDate:string,endDate:string,locale:V70Locale):TripRequest{
 const nights=Math.max(1,Math.min(14,Math.round((Date.parse(`${endDate}T00:00:00Z`)-Date.parse(`${startDate}T00:00:00Z`))/86400000)));
 return{origin:"Greece",startDate,endDate,month:"flexible",nights,budget:1200,moods:["nature"],travelerType:"couple",language:locale,distancePreference:"any",pace:"balanced",hotelStyle:"any",avoid:"none",entryMode:"unknown",groupSize:2,desiredEnergy:"balanced",socialPreference:"balanced",noveltyPreference:"balanced",mustHave:"none",dateFlexibility:"fixed",transportMode:"any",stayLocationPreference:"balanced"};
}
function weatherCandidate(node:CandidateNodeV70):AffiliateDestinationCandidate{
 return{destinationId:node.node_key,locationLabel:node.display_name,countryHint:"GR",latitude:node.latitude,longitude:node.longitude,propertyCount:node.property_count,activeOfferCount:node.offer_count,fiveStarOfferCount:0,alternativeOfferCount:0,demandScore:Number(node.demand_signal??0),saleOfferCount:0,topOffers:[]};
}
export async function getWeatherContextV70(node:CandidateNodeV70,startDate:string,endDate:string,locale:V70Locale):Promise<WeatherContextV70>{
 const evidence=await getWeatherEvidence(evidenceTrip(startDate,endDate,locale),weatherCandidate(node));
 // Deliberately omit legacy numeric weather score. V70 agents consume weather facts and uncertainty as evidence only.
 return{key:node.node_key,source:evidence.source,sourceLabel:evidence.sourceLabel,confidence:evidence.confidence,typical:evidence.typical,
  temperatureMinC:evidence.temperatureMinC??null,temperatureMeanC:evidence.temperatureMeanC??null,temperatureMaxC:evidence.temperatureMaxC??null,
  precipitationMmDay:evidence.precipitationMmDay??null,windKmh:evidence.windKmh??null,sunSignal:evidence.sunSignal??null,summary:evidence.summary,researchedAt:evidence.researchedAt};
}
export async function loadWeatherContextsV70(nodes:CandidateNodeV70[],input:{startDate:string;endDate:string;locale:V70Locale;limit?:number}){
 const selected=nodes.slice(0,Math.max(1,Math.min(60,input.limit??24))),out:WeatherContextV70[]=[];
 for(let i=0;i<selected.length;i+=6){
  const chunk=selected.slice(i,i+6);
  const rows=await Promise.all(chunk.map(node=>getWeatherContextV70(node,input.startDate,input.endDate,input.locale).catch(()=>null)));
  out.push(...rows.filter((row):row is WeatherContextV70=>Boolean(row)));
 }
 return out;
}
