import type { InventoryDestinationOptionV15 } from "@/lib/data/stay-cities-v15";
import type { V8Destination } from "@/lib/decision/v8-types";

export type ExternalSignalStatusV30="live"|"not-configured"|"unavailable";
export interface TripadvisorCitySignalV30{
  status:ExternalSignalStatusV30;
  rating5:number|null;
  reviewCount:number;
  bestRanking:number|null;
  sampleSize:number;
  sourceMonth:string;
}
export interface BookingCitySignalV30{
  status:ExternalSignalStatusV30;
  reviewScore10:number|null;
  reviewCount:number;
  accommodationCount:number;
  sourceDate:string;
}
export interface CityMapRankV30{
  rank:number;
  slug:string;
  nameEl:string;
  nameEn:string;
  regionGroup:string;
  latitude:number;
  longitude:number;
  tags:string[];
  seasonScore:number;
  supplyScore:number;
  routeScore:number;
  valueScore:number;
  baseAiScore:number;
  aiScore:number;
  propertyCount:number;
  offerCount:number;
  tripadvisor:TripadvisorCitySignalV30|null;
  booking:BookingCitySignalV30|null;
  reasonsEl:string[];
  reasonsEn:string[];
}

const clamp=(value:number,min=0,max=100)=>Math.max(min,Math.min(max,value));
const logScore=(value:number,max:number)=>max<=0?0:clamp(Math.log1p(Math.max(0,value))/Math.log1p(max)*100);
const monthIndex=(month:number)=>Math.max(1,Math.min(12,Math.round(month)))-1;

function externalBlend(base:number,tripadvisor:TripadvisorCitySignalV30|null,booking:BookingCitySignalV30|null){
  const signals:[number,number][]=[[base,.72]];
  if(tripadvisor?.status==="live"&&tripadvisor.rating5!=null)signals.push([clamp(tripadvisor.rating5/5*100),.16]);
  if(booking?.status==="live"&&booking.reviewScore10!=null)signals.push([clamp(booking.reviewScore10/10*100),.12]);
  const total=signals.reduce((sum,[,weight])=>sum+weight,0);
  return Math.round(signals.reduce((sum,[score,weight])=>sum+score*weight,0)/Math.max(.01,total));
}

export function buildCityMapRankingV30(args:{
  catalog:readonly V8Destination[];
  inventory:readonly InventoryDestinationOptionV15[];
  month:number;
  tripadvisor?:ReadonlyMap<string,TripadvisorCitySignalV30>;
  booking?:ReadonlyMap<string,BookingCitySignalV30>;
  limit?:number;
}):CityMapRankV30[]{
  const inventoryBySlug=new Map(args.inventory.map(item=>[item.slug,item]));
  const greek=args.catalog.filter(destination=>destination.countryCode==="GR");
  const maxProperties=Math.max(1,...args.inventory.map(item=>item.propertyCount));
  const maxOffers=Math.max(1,...args.inventory.map(item=>item.offerCount));
  const scored=greek.map(destination=>{
    const inv=inventoryBySlug.get(destination.slug),propertyCount=inv?.propertyCount??0,offerCount=inv?.offerCount??0;
    const seasonScore=clamp(destination.monthFit[monthIndex(args.month)]??50);
    const supplyScore=Math.round(logScore(propertyCount,maxProperties)*.62+logScore(offerCount,maxOffers)*.38);
    const routeScore=Math.round(clamp(destination.routeConfidence*100));
    const valueScore=Math.round(clamp(112-destination.costTier*14-destination.crowdLevel*3));
    const baseAiScore=Math.round(seasonScore*.5+supplyScore*.24+routeScore*.16+valueScore*.1);
    const tripadvisor=args.tripadvisor?.get(destination.slug)??null,booking=args.booking?.get(destination.slug)??null;
    const aiScore=externalBlend(baseAiScore,tripadvisor,booking);
    const reasonsEl=[
      seasonScore>=80?"Πολύ δυνατή εποχικότητα για τον επιλεγμένο μήνα":seasonScore>=65?"Καλή εποχική καταλληλότητα":"Μέτρια εποχική καταλληλότητα",
      propertyCount>0?`${propertyCount} ενεργά καταλύματα στο verified inventory`:"Δεν υπάρχει ακόμη αρκετό verified stay inventory",
      routeScore>=85?"Υψηλή βεβαιότητα πρόσβασης/μετάβασης":"Η μετάβαση χρειάζεται περισσότερη προσοχή",
    ];
    const reasonsEn=[
      seasonScore>=80?"Very strong seasonal fit for the selected month":seasonScore>=65?"Good seasonal fit":"Moderate seasonal fit",
      propertyCount>0?`${propertyCount} active stays in verified inventory`:"Verified stay inventory is still limited",
      routeScore>=85?"High route/access confidence":"Access needs more scrutiny",
    ];
    if(tripadvisor?.status==="live"&&tripadvisor.rating5!=null){reasonsEl.push(`Tripadvisor evidence ${tripadvisor.rating5.toFixed(1)}/5 από ${tripadvisor.reviewCount.toLocaleString("el-GR")} reviews`);reasonsEn.push(`Tripadvisor evidence ${tripadvisor.rating5.toFixed(1)}/5 from ${tripadvisor.reviewCount.toLocaleString("en-GB")} reviews`);}
    if(booking?.status==="live"){reasonsEl.push(`Booking.com: ${booking.accommodationCount} διαθέσιμα αποτελέσματα στο ημερήσιο check`);reasonsEn.push(`Booking.com: ${booking.accommodationCount} results in the daily availability check`);}
    return{rank:0,slug:destination.slug,nameEl:destination.nameEl,nameEn:destination.nameEn,regionGroup:destination.regionGroup,latitude:destination.latitude,longitude:destination.longitude,tags:[...destination.tags],seasonScore,supplyScore,routeScore,valueScore,baseAiScore,aiScore,propertyCount,offerCount,tripadvisor,booking,reasonsEl,reasonsEn};
  }).filter(item=>item.seasonScore>=35||item.propertyCount>0).sort((a,b)=>b.aiScore-a.aiScore||b.seasonScore-a.seasonScore||b.propertyCount-a.propertyCount).slice(0,Math.max(4,Math.min(20,args.limit??12)));
  return scored.map((item,index)=>({...item,rank:index+1}));
}
