import { loadGlobalStayCandidatesV21,type GlobalStayCandidateV21 } from "@/lib/data/global-stays-v21";
import { assessStayAvailabilityV20 } from "@/lib/decision/stay-availability-v20";
import { evaluateStayOfferV16 } from "@/lib/decision/stay-constraints-v16";
import { V8_DIMENSIONS,type StayConstraintSpec,type V8Dimension,type V8IntentProfile } from "@/lib/decision/v8-types";
import type { V8Ranked } from "@/lib/decision/v8-matcher";
import type { TripRequest } from "@/lib/validation/trip";

const clamp=(value:number,min=0,max=100)=>Math.max(min,Math.min(max,value));
const negativeGateDimensions=new Set<V8Dimension>(["nightlife","luxury","adventure","city"]);
const styleVectorIndex:Record<Exclude<TripRequest["hotelStyle"],"any">,number>={luxury:8,boutique:9,resort:10,value:11};
const travelerVectorIndex:Record<TripRequest["travelerType"],number>={family:12,couple:13,solo:14,friends:15};

export interface V21ChoiceAudit{
  semanticRejected:string[];
  stayScanRan:boolean;
  stayScanFailed:boolean;
  mappedStayCount:number;
  destinationsWithMappedStays:number;
  hardStayRejected:string[];
  bestStayFit:Record<string,number>;
}

function affinity(item:V8Ranked,dimension:V8Dimension){const index=V8_DIMENSIONS.indexOf(dimension);return index>=0?item.destination.vector[index]??0:0;}

export function semanticEligibilityReasonV21(item:V8Ranked,intent:V8IntentProfile):string|null{
  const semantic=intent.semantic;if(!semantic)return null;
  for(const [dimension,weight] of Object.entries(semantic.negative) as Array<[V8Dimension,number|undefined]>){
    const negative=weight??0,positive=semantic.positive[dimension]??0;
    if(negativeGateDimensions.has(dimension)&&negative>=.86&&positive<.30&&affinity(item,dimension)>=.75)return `negative:${dimension}`;
  }
  const firstPriority=semantic.priorities[0];
  if(firstPriority&&(semantic.positive[firstPriority]??0)>=.82&&affinity(item,firstPriority)<.50)return `priority-miss:${firstPriority}`;
  if(semantic.qualifiers.avoidCrowds>=.90&&item.destination.crowdLevel>=4)return "negative:crowds";
  if(semantic.qualifiers.avoidCrowds>=.76&&item.destination.crowdLevel>=5)return "negative:crowds";
  if(semantic.qualifiers.easyAccess>=.92&&item.breakdown.effort<52)return "negative:access";
  return null;
}

function fallbackStyleAffinity(candidate:GlobalStayCandidateV21,style:TripRequest["hotelStyle"]){
  if(style==="any")return 70;
  const text=`${candidate.propertyName} ${candidate.description??""}`.toLowerCase();
  if(style==="boutique")return /boutique|design|concept/.test(text)?90:48;
  if(style==="resort")return /resort|all inclusive|spa/.test(text)?90:45;
  if(style==="luxury")return candidate.starLevel&&candidate.starLevel>=5?95:candidate.starLevel===4?70:/luxury|palace|premium/.test(text)?82:45;
  if(style==="value")return candidate.price!=null?clamp(92-candidate.price/3,42,90):58;
  return 60;
}
function vectorAffinity(candidate:GlobalStayCandidateV21,index:number,fallback:number){return candidate.semanticVector.length===24?clamp((candidate.semanticVector[index]??.5)*100):fallback;}
function locationAffinity(distance:number|null|undefined,preference:TripRequest["stayLocationPreference"]){
  if(preference==="balanced")return 72;
  const d=distance??20;
  if(preference==="central")return clamp(100-d*5,30,100);
  if(d>=4&&d<=22)return 92;if(d<4)return clamp(58+d*6,58,82);return clamp(92-(d-22)*2,42,92);
}

export function scoreGlobalStayCandidateV21(candidate:GlobalStayCandidateV21,request:TripRequest,spec:StayConstraintSpec){
  const evaluation=evaluateStayOfferV16(candidate,spec);
  if(!evaluation.passed)return{eligible:false,score:0,softMatches:evaluation.softMatches.length,hardFailures:evaluation.hardFailures};
  const truth=assessStayAvailabilityV20(candidate,request.startDate,request.endDate);
  if(truth.state==="EXPLICITLY_UNAVAILABLE"||truth.state==="OUTSIDE_VALIDITY_WINDOW"||truth.state==="INVALID_FEED_EVIDENCE")return{eligible:false,score:0,softMatches:evaluation.softMatches.length,hardFailures:[] as typeof evaluation.hardFailures};
  const styleFallback=fallbackStyleAffinity(candidate,request.hotelStyle),style=request.hotelStyle==="any"?70:vectorAffinity(candidate,styleVectorIndex[request.hotelStyle],styleFallback),traveler=vectorAffinity(candidate,travelerVectorIndex[request.travelerType],68),location=locationAffinity(candidate.distanceKm,request.stayLocationPreference),soft=spec.soft.length?50+50*(evaluation.softMatches.length/spec.soft.length):70,truthScore=truth.state==="CONFIRMED_ACTIVE"?82:65;
  const score=style*.36+traveler*.16+location*.20+soft*.20+truthScore*.08;
  return{eligible:true,score:clamp(score),softMatches:evaluation.softMatches.length,hardFailures:[] as typeof evaluation.hardFailures};
}

function hasAccommodationSignal(request:TripRequest,spec:StayConstraintSpec){return spec.hard.length>0||spec.soft.length>0||request.hotelStyle!=="any"||request.stayLocationPreference!=="balanced";}

export async function applyChoiceCorrectnessV21(request:TripRequest,intent:V8IntentProfile,spec:StayConstraintSpec,ranked:V8Ranked[]):Promise<{ranked:V8Ranked[];audit:V21ChoiceAudit}>{
  const semanticRejected:string[]=[],semanticSurvivors=ranked.filter(item=>{const reason=semanticEligibilityReasonV21(item,intent);if(reason){semanticRejected.push(`${item.destination.slug}:${reason}`);return false}return true});
  const baseAudit:V21ChoiceAudit={semanticRejected,stayScanRan:false,stayScanFailed:false,mappedStayCount:0,destinationsWithMappedStays:0,hardStayRejected:[],bestStayFit:{}};
  if(!hasAccommodationSignal(request,spec)||!semanticSurvivors.length)return{ranked:semanticSurvivors,audit:baseAudit};
  try{
    const stays=await loadGlobalStayCandidatesV21(request.startDate,request.endDate,40),bySlug=new Map<string,GlobalStayCandidateV21[]>();
    for(const stay of stays){const list=bySlug.get(stay.destinationSlug)??[];list.push(stay);bySlug.set(stay.destinationSlug,list)}
    const hardStayRejected:string[]=[],bestStayFit:Record<string,number>={},rescored:V8Ranked[]=[];
    for(const item of semanticSurvivors){
      const candidates=bySlug.get(item.destination.slug)??[],scores=candidates.map(candidate=>scoreGlobalStayCandidateV21(candidate,request,spec)).filter(row=>row.eligible).map(row=>row.score),best=scores.length?Math.max(...scores):null;
      if(spec.hard.length&&best==null){hardStayRejected.push(item.destination.slug);continue}
      if(best!=null)bestStayFit[item.destination.slug]=Math.round(best);
      const delta=best==null?-3:clamp((best-62)*.14,-4,7),score=clamp(item.score+delta);
      rescored.push({...item,score,preScore:clamp(item.preScore+delta)});
    }
    rescored.sort((a,b)=>b.score-a.score);
    return{ranked:rescored,audit:{semanticRejected,stayScanRan:true,stayScanFailed:false,mappedStayCount:stays.length,destinationsWithMappedStays:bySlug.size,hardStayRejected,bestStayFit}};
  }catch{
    return{ranked:semanticSurvivors,audit:{...baseAudit,stayScanRan:true,stayScanFailed:true}};
  }
}
