import { researchDestination } from "@/lib/ai/destination-research";
import { loadV8DestinationCatalog,loadV8StayOffers } from "@/lib/data/destination-v8";
import { assessStayWindowV25 } from "@/lib/data/provider-availability-v25";
import { getTripadvisorBundleV25 } from "@/lib/data/tripadvisor-v25";
import { getDailyTripWeatherV25 } from "@/lib/data/trip-weather-v25";
import { estimateBeyondHotelBudgetV25 } from "@/lib/decision/trip-budget-v25";
import type { FlexibleWindowV25,InternetResearchV25,TripBuilderPlanV25,TripBuilderRequestV25 } from "@/lib/trip-builder/types-v25";
import type { Month,TripRequest } from "@/lib/validation/trip";

const DAY=86_400_000;
const addDays=(iso:string,days:number)=>new Date(Date.parse(`${iso}T00:00:00Z`)+days*DAY).toISOString().slice(0,10);
const monthFromDate=(iso:string):Month=>Number(iso.slice(5,7))===9?"september":Number(iso.slice(5,7))===10?"october":Number(iso.slice(5,7))===11?"november":"flexible";
const today=()=>new Date().toISOString().slice(0,10);
export function sameWeekdayFlexibleWindowsV25(startDate:string,endDate:string){const nights=Math.round((Date.parse(`${endDate}T00:00:00Z`)-Date.parse(`${startDate}T00:00:00Z`))/DAY),out:Array<{startDate:string;endDate:string;shiftDays:number}>=[];for(const shiftDays of[-14,-7,7,14,21,28]){const start=addDays(startDate,shiftDays);if(start<today())continue;out.push({startDate:start,endDate:addDays(start,nights),shiftDays});}return out.slice(0,5)}
function withDates(trip:TripRequest,startDate:string,endDate:string):TripRequest{return{...trip,startDate,endDate,nights:Math.max(1,Math.round((Date.parse(`${endDate}T00:00:00Z`)-Date.parse(`${startDate}T00:00:00Z`))/DAY)),month:monthFromDate(startDate)}}
function isSummer(startDate:string,endDate:string){for(let t=Date.parse(`${startDate}T00:00:00Z`),last=Date.parse(`${endDate}T00:00:00Z`);t<=last;t+=DAY){const month=new Date(t).getUTCMonth()+1;if(month>=6&&month<=9)return true}return false}
function guidePath(slug:string,offerId:string,trip:TripRequest){const tripToken=Buffer.from(JSON.stringify(trip),"utf8").toString("base64url"),p=new URLSearchParams({slug,offer:offerId,trip:tripToken});return`/travel-guide?${p}`}
function mapWebResearch(result:Awaited<ReturnType<typeof researchDestination>>):InternetResearchV25{const bullets=result.attractions.slice(0,5).flatMap(item=>{const summary=item.summary??null;if(!summary)return[];return[{name:item.name,summary,why:item.whyItFits??null,strength:item.evidenceStrength??"MEDIUM" as const}]});return{status:result.source==="verified-synthesis"?"verified-synthesis":result.source==="research-pending"?"research-pending":"unavailable",overview:result.overview??null,bullets,practicalNotes:result.practicalNotes.slice(0,5),sources:result.sources.map(source=>({title:source.title,url:source.url,domain:source.domain}))}}

export async function buildTripBuilderV25(input:TripBuilderRequestV25):Promise<TripBuilderPlanV25>{
 const{trip,slug,offerId}=input,[catalog,originalOffers]=await Promise.all([loadV8DestinationCatalog(),loadV8StayOffers(slug,trip.startDate,trip.endDate,40)]),destination=catalog.find(item=>item.slug===slug);if(!destination)throw new Error("Destination not found");
 const selected=originalOffers.find(item=>item.sourceProductId===offerId)??null;if(!selected)throw new Error("Selected stay is not valid for the complete requested window");
 const groupSize=Math.max(1,trip.groupSize??1),lat=selected.latitude??destination.latitude,lon=selected.longitude??destination.longitude,summer=isSummer(trip.startDate,trip.endDate),destinationName=trip.language==="en"?destination.nameEn:destination.nameEl;
 const[availability,weather,tripadvisor,research]=await Promise.all([
  assessStayWindowV25({slug,startDate:trip.startDate,endDate:trip.endDate,offerId:selected.sourceProductId,propertyName:selected.propertyName,groupSize,probeProvider:true}),
  getDailyTripWeatherV25(trip,lat,lon),
  getTripadvisorBundleV25({destinationName,hotelName:selected.propertyName,latitude:lat,longitude:lon,isSummer:summer,language:trip.language==="en"?"en":"el"}),
  researchDestination({destination:destinationName,latitude:lat,longitude:lon,language:trip.language==="en"?"en":"el",travelerType:trip.travelerType,moods:trip.moods,nights:trip.nights}),
 ]);
 const candidates=sameWeekdayFlexibleWindowsV25(trip.startDate,trip.endDate),flexibleWindows:FlexibleWindowV25[]=[];
 for(const candidate of candidates){const shiftedTrip=withDates(trip,candidate.startDate,candidate.endDate),[availabilityResult,windowWeather]=await Promise.all([assessStayWindowV25({slug,startDate:candidate.startDate,endDate:candidate.endDate,offerId:selected.sourceProductId,propertyName:selected.propertyName,groupSize,probeProvider:true}),getDailyTripWeatherV25(shiftedTrip,lat,lon)]);flexibleWindows.push({startDate:candidate.startDate,endDate:candidate.endDate,shiftDays:candidate.shiftDays,sameWeekdayPattern:true,weatherScore:windowWeather.score,weatherLabel:windowWeather.label,availability:availabilityResult.truth,alternativeStayCount:availabilityResult.alternativeStayCount});}
 flexibleWindows.sort((a,b)=>{const stock=(x:FlexibleWindowV25)=>x.availability.state==="CONFIRMED_ACTIVE"?3:x.availability.state==="PROVIDER_PAGE_REACHED"||x.availability.state==="VALID_WINDOW_STOCK_UNKNOWN"?2:x.availability.state==="NOT_IN_FEED"?0:1;return stock(b)-stock(a)||(b.weatherScore??-1)-(a.weatherScore??-1)||Math.abs(a.shiftDays)-Math.abs(b.shiftDays)});
 const budgetBeyondHotel=estimateBeyondHotelBudgetV25(trip,destination.costTier),webResearch=mapWebResearch(research);
 return{release:"V25",generatedAt:new Date().toISOString(),destination:{slug:destination.slug,name:destination.nameEl,nameEn:destination.nameEn,latitude:destination.latitude,longitude:destination.longitude,isSummer:summer},trip,stay:{sourceProductId:selected.sourceProductId,propertyName:selected.propertyName,trackingUrl:selected.trackingUrl,imageUrl:selected.imageUrl??selected.thumbUrl??null,price:selected.price??null,currency:selected.currency??null},availability:availability.truth,weather,flexibleWindows,tripadvisor,webResearch,budgetBeyondHotel,guide:{path:guidePath(slug,selected.sourceProductId,trip),canvaReady:true,canvaTemplateStatus:process.env.CANVA_TRAVEL_GUIDE_TEMPLATE_ID?"ready-for-autofill":"requires-canva-template"}};
}
