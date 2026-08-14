import type { DestinationChoiceProfileV22 } from "@/lib/data/destination-choice-profiles-v22";
import { V8_DIMENSIONS,type V8Dimension,type V8IntentProfile } from "@/lib/decision/v8-types";
import type { V8Ranked } from "@/lib/decision/v8-matcher";
import type { TripRequest } from "@/lib/validation/trip";

const clamp=(value:number,min=0,max=100)=>Math.max(min,Math.min(max,value));
const clamp01=(value:number)=>Math.max(0,Math.min(1,value));
const catalogIndex=Object.fromEntries(V8_DIMENSIONS.map((d,i)=>[d,i])) as Record<V8Dimension,number>;
// destination_semantic_profiles uses semantic_dimensions 1..24; values below are zero-based.
const profileIndex:Partial<Record<V8Dimension,number>>={relax:0,romantic:1,food:2,warmth:3,city:4,nature:5,adventure:6,culture:7,luxury:8,value:11,family:12,beach:19,nightlife:20,wellness:21,short_break:22,shoulder_season:23};
const choiceDimensions:V8Dimension[]=["romantic","relax","food","culture","city","nature","beach","adventure","nightlife","family","luxury","value","warmth","wellness"];

export interface CriterionRelevanceAuditV22{
 profilesAvailable:number;
 profilesUsed:number;
 activeDimensions:V8Dimension[];
 primaryPriority:V8Dimension|null;
 dimensionRanges:Partial<Record<V8Dimension,number>>;
 scoreDelta:Record<string,number>;
}

function profileAffinity(item:V8Ranked,profile:DestinationChoiceProfileV22|undefined,dimension:V8Dimension){
 const base=clamp01(item.destination.vector[catalogIndex[dimension]]??.05),pIndex=profileIndex[dimension];
 if(!profile||pIndex==null||profile.vector.length!==24)return base;
 const rich=clamp01(profile.vector[pIndex]??base),alpha=.38+.20*clamp01(profile.confidence);
 return clamp01(base*(1-alpha)+rich*alpha);
}

function positiveWeight(request:TripRequest,intent:V8IntentProfile,dimension:V8Dimension){
 let weight=Math.max(0,intent.weights[dimension]??0),semantic=intent.semantic;
 if(semantic)weight=Math.max(weight,(semantic.positive[dimension]??0)*1.35);
 const moodMap:Partial<Record<TripRequest["moods"][number],V8Dimension>>={romantic:"romantic",relax:"relax",food:"food",culture:"culture",city:"city",nature:"nature",adventure:"adventure",warmth:"warmth"};
 if(request.moods.some(mood=>moodMap[mood]===dimension))weight=Math.max(weight,1.15);
 if(request.mustHave==="sea"&&dimension==="beach")weight=Math.max(weight,1.25);
 if(request.mustHave==="nature"&&dimension==="nature")weight=Math.max(weight,1.25);
 if(request.mustHave==="culture"&&dimension==="culture")weight=Math.max(weight,1.25);
 if(request.mustHave==="nightlife"&&dimension==="nightlife")weight=Math.max(weight,1.25);
 if(request.socialPreference==="quiet"&&dimension==="relax")weight=Math.max(weight,.75);
 if(request.socialPreference==="lively"&&(dimension==="city"||dimension==="nightlife"))weight=Math.max(weight,dimension==="nightlife" ? .85 : .65);
 if(request.desiredEnergy==="restore"&&dimension==="relax")weight=Math.max(weight,.85);
 if(request.desiredEnergy==="stimulating"&&(dimension==="adventure"||dimension==="culture"||dimension==="city"))weight=Math.max(weight,dimension==="adventure" ? .75 : .55);
 const priorityIndex=semantic?.priorities.indexOf(dimension)??-1;if(priorityIndex>=0)weight*=priorityIndex===0 ? 1.65 : priorityIndex===1 ? 1.35 : 1.18;
 return Math.min(2.4,weight);
}

export function applyCriterionRelevanceV22(request:TripRequest,intent:V8IntentProfile,items:V8Ranked[],profiles:Map<string,DestinationChoiceProfileV22>):{ranked:V8Ranked[];audit:CriterionRelevanceAuditV22}{
 const primaryPriority=intent.semantic?.priorities[0]??null,weights=new Map<V8Dimension,number>();
 for(const dimension of choiceDimensions){const weight=positiveWeight(request,intent,dimension);if(weight>=.18)weights.set(dimension,weight);}
 const activeDimensions=[...weights.keys()],dimensionRanges:Partial<Record<V8Dimension,number>>={},values=new Map<V8Dimension,Map<string,number>>();
 for(const dimension of activeDimensions){const bySlug=new Map<string,number>(),all:number[]=[];for(const item of items){const value=profileAffinity(item,profiles.get(item.destination.slug),dimension);bySlug.set(item.destination.slug,value);all.push(value);}const min=Math.min(...all),max=Math.max(...all);dimensionRanges[dimension]=Number((max-min).toFixed(3));values.set(dimension,bySlug);}
 if(!activeDimensions.length||!items.length)return{ranked:items,audit:{profilesAvailable:profiles.size,profilesUsed:0,activeDimensions,primaryPriority,dimensionRanges,scoreDelta:{}}};
 const scoreDelta:Record<string,number>={},ranked=items.map(item=>{
  let positiveSum=0,weightSum=0;
  for(const [dimension,weight] of weights){const bySlug=values.get(dimension),raw=bySlug?.get(item.destination.slug)??.5,all=[...(bySlug?.values()??[])],min=all.length?Math.min(...all):0,max=all.length?Math.max(...all):1,range=Math.max(0,max-min),relative=range>=.06?(raw-min)/range:.5,information=range>=.10?Math.min(1,.25+range*1.6):.14,fit=.58*raw+.42*relative;positiveSum+=fit*weight*information;weightSum+=weight*information;}
  const criterionFit=weightSum>0?positiveSum/weightSum:.5,priorityStrength=primaryPriority&&weights.has(primaryPriority) ? .40 : .30;
  let delta=(criterionFit-.5)*100*priorityStrength;
  const semantic=intent.semantic;if(semantic){for(const dimension of choiceDimensions){const negative=clamp01(semantic.negative[dimension]??0);if(negative<.2)continue;const raw=profileAffinity(item,profiles.get(item.destination.slug),dimension);delta-=negative*raw*(negative>=.85?15:10);}}
  delta=clamp(delta,-22,20);scoreDelta[item.destination.slug]=Number(delta.toFixed(2));return{...item,score:clamp(item.score+delta),preScore:clamp(item.preScore+delta)};
 }).sort((a,b)=>b.score-a.score);
 return{ranked,audit:{profilesAvailable:profiles.size,profilesUsed:items.filter(item=>profiles.has(item.destination.slug)).length,activeDimensions,primaryPriority,dimensionRanges,scoreDelta}};
}
