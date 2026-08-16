import { GREEK_ISLAND_SLUGS } from "@/lib/decision/geography-constraint";
import { V8_DIMENSIONS,type V8Destination,type V8Dimension,type V8IntentProfile } from "@/lib/decision/v8-types";
import type { V8Ranked } from "@/lib/decision/v8-matcher";
import type { TripRequest } from "@/lib/validation/trip";

const clamp=(value:number,min=0,max=100)=>Math.max(min,Math.min(max,value));
const vectorIndex=Object.fromEntries(V8_DIMENSIONS.map((dimension,index)=>[dimension,index])) as Record<V8Dimension,number>;
const CAR_FREE_CURATED=new Set(["hydra"]);

export type CriterionFailureCode=
 | "MUST_SEA"
 | "MUST_NATURE"
 | "MUST_CULTURE"
 | "MUST_NIGHTLIFE"
 | "ISLAND_ONLY"
 | "REDLINE_CROWDS"
 | "REDLINE_HIGH_COST"
 | "REDLINE_LONG_TRAVEL"
 | "NO_CAR_LOCAL_MOBILITY"
 | "NEARBY_TOO_FAR"
 | "EASY_HOP_TOO_HARD"
 | "PRIMARY_PRIORITY_MISS"
 | "ACCURACY_FLOOR";

export interface CriterionTruthV26{
 eligible:boolean;
 failures:CriterionFailureCode[];
 budgetFit:number;
 budgetTargetTier:1|2|3|4|5;
}
export interface CriterionTruthAuditV26{
 checked:number;
 rejected:number;
 rejectedBy:Partial<Record<CriterionFailureCode,number>>;
 budgetCorrections:number;
 publicFloor:number|null;
}

export function budgetTargetTierV26(request:TripRequest):1|2|3|4|5{
 const people=Math.max(1,request.groupSize??(request.travelerType==="solo"?1:request.travelerType==="couple"?2:4));
 const perPersonNight=request.budget/Math.max(1,request.nights)/people;
 if(perPersonNight<55)return 1;if(perPersonNight<90)return 2;if(perPersonNight<145)return 3;if(perPersonNight<225)return 4;return 5;
}

export function budgetFitV26(request:TripRequest,destination:V8Destination){
 const target=budgetTargetTierV26(request),over=Math.max(0,destination.costTier-target),under=Math.max(0,target-destination.costTier);
 let score=100-over*23-under*2;if(destination.tags.includes("value"))score+=5;if(request.avoid==="high-cost"&&destination.costTier>=4)score-=18;
 return clamp(score,20,100);
}

export function hasLiteralMustHaveV26(request:TripRequest,destination:V8Destination){
 if(request.mustHave==="sea")return destination.tags.includes("beach");
 if(request.mustHave==="nature")return destination.tags.includes("nature");
 if(request.mustHave==="culture")return destination.tags.includes("culture");
 if(request.mustHave==="nightlife")return destination.tags.includes("nightlife");
 return true;
}

function noCarLocalMobilityV26(destination:V8Destination){
 // Precision-first until a dedicated local-mobility evidence table exists. Broad rural/island
 // destinations do not pass merely because arrival is easy. Curated CITY means an urban base;
 // Hydra is explicitly handled as the canonical car-free exception.
 return CAR_FREE_CURATED.has(destination.slug)||(destination.tags.includes("city")&&destination.routeConfidence>=.75);
}

function primaryPriorityMissV26(intent:V8IntentProfile|undefined,destination:V8Destination){
 const primary=intent?.semantic?.priorities[0];if(!primary)return false;
 const strength=intent?.semantic?.positive[primary]??0;if(strength<.82)return false;
 const index=vectorIndex[primary],affinity=index==null?0:destination.vector[index]??0;
 return affinity<.50;
}

export function criterionTruthV26(request:TripRequest,destination:V8Destination,options:{effortScore?:number;intent?:V8IntentProfile;publicStage?:boolean}={}):CriterionTruthV26{
 const failures:CriterionFailureCode[]=[],target=budgetTargetTierV26(request),budgetFit=budgetFitV26(request,destination),effort=options.effortScore;
 if(request.mustHave==="sea"&&!destination.tags.includes("beach"))failures.push("MUST_SEA");
 if(request.mustHave==="nature"&&!destination.tags.includes("nature"))failures.push("MUST_NATURE");
 if(request.mustHave==="culture"&&!destination.tags.includes("culture"))failures.push("MUST_CULTURE");
 if(request.mustHave==="nightlife"&&!destination.tags.includes("nightlife"))failures.push("MUST_NIGHTLIFE");
 if(request.distancePreference==="island"&&!GREEK_ISLAND_SLUGS.has(destination.slug))failures.push("ISLAND_ONLY");
 if(request.avoid==="crowds"&&destination.crowdLevel>=5)failures.push("REDLINE_CROWDS");
 if(request.avoid==="high-cost"&&(destination.costTier>=5||destination.costTier>target+1))failures.push("REDLINE_HIGH_COST");
 if(request.avoid==="long-travel"&&effort!=null&&effort<60)failures.push("REDLINE_LONG_TRAVEL");
 if(request.transportMode==="no-car"&&!noCarLocalMobilityV26(destination))failures.push("NO_CAR_LOCAL_MOBILITY");
 if(options.publicStage&&request.distancePreference==="nearby"&&effort!=null&&effort<70)failures.push("NEARBY_TOO_FAR");
 if(options.publicStage&&request.distancePreference==="easy-hop"&&effort!=null&&effort<55)failures.push("EASY_HOP_TOO_HARD");
 if(primaryPriorityMissV26(options.intent,destination))failures.push("PRIMARY_PRIORITY_MISS");
 return{eligible:failures.length===0,failures,budgetFit,budgetTargetTier:target};
}

export function applyCriterionTruthV26(request:TripRequest,intent:V8IntentProfile,items:readonly V8Ranked[],options:{publicStage?:boolean}={}):{ranked:V8Ranked[];audit:CriterionTruthAuditV26}{
 const rejectedBy:Partial<Record<CriterionFailureCode,number>>={},corrected:V8Ranked[]=[],publicStage=options.publicStage===true;
 let budgetCorrections=0;
 for(const item of items){
  const truth=criterionTruthV26(request,item.destination,{effortScore:item.breakdown.effort,intent,publicStage});
  if(!truth.eligible){for(const failure of truth.failures)rejectedBy[failure]=(rejectedBy[failure]??0)+1;continue;}
  const budgetDelta=truth.budgetFit-item.breakdown.budget;if(Math.abs(budgetDelta)>=1)budgetCorrections+=1;
  corrected.push({...item,score:clamp(item.score+budgetDelta*.09),preScore:clamp(item.preScore+budgetDelta*.09),breakdown:{...item.breakdown,budget:Math.round(truth.budgetFit)}});
 }
 corrected.sort((a,b)=>b.score-a.score);
 let ranked=corrected,publicFloor:number|null=null;
 if(publicStage&&corrected.length){
  const best=corrected[0].score;publicFloor=Math.max(52,best-16);
  ranked=corrected.filter(item=>{
   const ok=item.score>=publicFloor&&item.breakdown.season>=40&&item.breakdown.budget>=25&&item.breakdown.crowdFit>25;
   if(!ok)rejectedBy.ACCURACY_FLOOR=(rejectedBy.ACCURACY_FLOOR??0)+1;
   return ok;
  });
 }
 return{ranked,audit:{checked:items.length,rejected:items.length-ranked.length,rejectedBy,budgetCorrections,publicFloor}};
}
