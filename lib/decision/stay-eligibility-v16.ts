import { loadV8StayOffers } from "@/lib/data/destination-v8";
import { filterStayOffersV16,hasHardStayConstraintsV16 } from "@/lib/decision/stay-constraints-v16";
import type { StayConstraintSpec,V8StayOffer } from "@/lib/decision/v8-types";
import type { V8Ranked } from "@/lib/decision/v8-matcher";
import type { TripRequest } from "@/lib/validation/trip";

export interface StayEligibilityV16{
 checked:boolean;
 checkedSlugs:string[];
 eligibleSlugs:string[];
 failedSlugs:string[];
 matchingOffers:Map<string,V8StayOffer[]>;
}

export async function gateRankedByStayRequirementsV16(request:TripRequest,ranked:V8Ranked[],spec:StayConstraintSpec,target=12):Promise<{ranked:V8Ranked[];audit:StayEligibilityV16}>{
 if(!hasHardStayConstraintsV16(spec))return{ranked,audit:{checked:false,checkedSlugs:[],eligibleSlugs:ranked.map(item=>item.destination.slug),failedSlugs:[],matchingOffers:new Map()}};
 const checkedSlugs:string[]=[],eligibleSlugs:string[]=[],failedSlugs:string[]=[],matchingOffers=new Map<string,V8StayOffer[]>(),survivors:V8Ranked[]=[];
 const batchSize=6;
 for(let offset=0;offset<ranked.length&&survivors.length<target;offset+=batchSize){
  const batch=ranked.slice(offset,offset+batchSize);
  const rows=await Promise.all(batch.map(async item=>{
   try{
    const offers=await loadV8StayOffers(item.destination.slug,request.startDate,request.endDate,40),matching=filterStayOffersV16(offers,spec).map(row=>row.offer);
    return{item,matching};
   }catch{return{item,matching:[] as V8StayOffer[]};}
  }));
  for(const row of rows){
   const slug=row.item.destination.slug;checkedSlugs.push(slug);
   if(row.matching.length){survivors.push(row.item);eligibleSlugs.push(slug);matchingOffers.set(slug,row.matching);}else failedSlugs.push(slug);
  }
 }
 return{ranked:survivors,audit:{checked:true,checkedSlugs,eligibleSlugs,failedSlugs,matchingOffers}};
}
