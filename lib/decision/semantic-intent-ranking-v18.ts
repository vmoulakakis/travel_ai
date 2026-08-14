import { V8_DIMENSIONS,type V8Dimension,type V8IntentProfile } from "@/lib/decision/v8-types";
import type { V8Ranked } from "@/lib/decision/v8-matcher";

const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
const index=Object.fromEntries(V8_DIMENSIONS.map((d,i)=>[d,i])) as Record<V8Dimension,number>;

export function semanticAdjustmentV18(item:V8Ranked,intent:V8IntentProfile){
 const semantic=intent.semantic;if(!semantic)return 0;let adjustment=0;
 for(const d of V8_DIMENSIONS){const negative=Math.max(0,Math.min(1,semantic.negative[d]??0));if(!negative)continue;const affinity=Math.max(0,Math.min(1,item.destination.vector[index[d]]??0));adjustment-=negative*affinity*16;if(negative>=.9&&affinity>=.85)adjustment-=5;}
 const q=semantic.qualifiers;if(q.avoidCrowds>0){const crowd=item.destination.crowdLevel;adjustment+=q.avoidCrowds*(crowd<=2?5:crowd===3?1:crowd===4?-5:-10);}
 if(q.easyAccess>0)adjustment+=q.easyAccess*clamp((item.breakdown.effort-72)/5,-8,6);
 if(q.slowRhythm>0){if(item.destination.tags.includes("relax"))adjustment+=3*q.slowRhythm;if(item.destination.tags.includes("nightlife"))adjustment-=4*q.slowRhythm;}
 // Walkability and local character are not asserted as destination facts here. Their positive influence is already represented conservatively through city/culture weights in the canonical intent contract.
 return clamp(adjustment,-24,12);
}

export function applySemanticIntentRankingV18(items:V8Ranked[],intent:V8IntentProfile){
 if(!intent.semantic)return items;return items.map(item=>{const adjustment=semanticAdjustmentV18(item,intent);return{...item,score:clamp(item.score+adjustment,0,100),preScore:clamp(item.preScore+adjustment,0,100)}}).sort((a,b)=>b.score-a.score);
}
