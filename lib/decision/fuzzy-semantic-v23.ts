import { V23_SEMANTIC_DIMENSIONS,type V23FuzzyIntentContract,type V23SemanticDimension,type V8SemanticIntent } from "@/lib/decision/v8-types";
import type { TripRequest } from "@/lib/validation/trip";

const clamp01=(value:number)=>Math.max(0,Math.min(1,value));
const maxSet=(target:Partial<Record<V23SemanticDimension,number>>,key:V23SemanticDimension,value:number)=>{target[key]=Math.max(target[key]??0,clamp01(value));};
const legacyMap:Record<string,V23SemanticDimension>={romantic:"romantic",relax:"relax",food:"food",culture:"culture",city:"city",nature:"nature",beach:"beach_season",adventure:"adventure",nightlife:"nightlife",family:"family",luxury:"luxury",value:"value",warmth:"warmth",wellness:"wellness",short_break:"short_break",shoulder_season:"shoulder_season"};
const idx=Object.fromEntries(V23_SEMANTIC_DIMENSIONS.map((d,i)=>[d,i])) as Record<V23SemanticDimension,number>;

export function vectorFromSemanticMapV23(map:Partial<Record<V23SemanticDimension,number>>){return V23_SEMANTIC_DIMENSIONS.map(d=>clamp01(map[d]??0));}
export function semanticMapFromVectorV23(vector:number[]){const out:Partial<Record<V23SemanticDimension,number>>={};for(const d of V23_SEMANTIC_DIMENSIONS){const value=clamp01(Number(vector[idx[d]]??0));if(value>0)out[d]=value;}return out;}

function applyLegacySemantic(positive:Partial<Record<V23SemanticDimension,number>>,negative:Partial<Record<V23SemanticDimension,number>>,semantic?:V8SemanticIntent){
 if(!semantic)return;
 for(const [raw,value] of Object.entries(semantic.positive)){const mapped=legacyMap[raw];if(mapped&&Number(value)>0)maxSet(positive,mapped,Number(value));if(raw==="warmth"&&Number(value)>0)maxSet(positive,"warm_climate",Number(value));}
 for(const [raw,value] of Object.entries(semantic.negative)){const mapped=legacyMap[raw];if(mapped&&Number(value)>0)maxSet(negative,mapped,Number(value));if(raw==="warmth"&&Number(value)>0)maxSet(negative,"warm_climate",Number(value));}
}

function applyStructured(request:TripRequest,positive:Partial<Record<V23SemanticDimension,number>>){
 const moods:Partial<Record<TripRequest["moods"][number],V23SemanticDimension>>={relax:"relax",romantic:"romantic",food:"food",warmth:"warmth",city:"city",nature:"nature",adventure:"adventure",culture:"culture"};
 for(const mood of request.moods){const d=moods[mood];if(d)maxSet(positive,d,.88);}
 if(request.moods.includes("warmth")){maxSet(positive,"warm_climate",.92);maxSet(positive,"beach_season",.48);}
 maxSet(positive,request.travelerType,.86);
 if(request.hotelStyle&&request.hotelStyle!=="any")maxSet(positive,request.hotelStyle,.92);
 if(request.distancePreference==="nearby")maxSet(positive,"low_effort",.94);
 if(request.distancePreference==="easy-hop")maxSet(positive,"low_effort",.78);
 if(request.avoid==="long-travel")maxSet(positive,"low_effort",.95);
 if(request.avoid==="high-cost")maxSet(positive,"value",.82);
 if(request.pace==="slow"){maxSet(positive,"relax",.68);maxSet(positive,"wellness",.38);}
 if(request.pace==="full"){maxSet(positive,"city",.48);maxSet(positive,"culture",.46);maxSet(positive,"adventure",.38);}
 if(request.desiredEnergy==="restore"){maxSet(positive,"relax",.9);maxSet(positive,"wellness",.62);maxSet(positive,"nature",.48);}
 if(request.desiredEnergy==="stimulating"){maxSet(positive,"adventure",.66);maxSet(positive,"city",.56);maxSet(positive,"culture",.46);}
 if(request.socialPreference==="quiet")maxSet(positive,"relax",.64);
 if(request.socialPreference==="lively"){maxSet(positive,"city",.66);maxSet(positive,"nightlife",.76);}
 if(request.noveltyPreference==="surprise")maxSet(positive,"adventure",.56);
 if(request.mustHave==="sea")maxSet(positive,"beach_season",1);
 if(request.mustHave==="nature")maxSet(positive,"nature",1);
 if(request.mustHave==="culture")maxSet(positive,"culture",1);
 if(request.mustHave==="nightlife")maxSet(positive,"nightlife",1);
 if(request.nights<=4)maxSet(positive,"short_break",.78);
 const month=Number(request.startDate.slice(5,7));if([4,5,9,10,11].includes(month)){maxSet(positive,"shoulder_season",.58);maxSet(positive,"all_weather",.42);}
 if(request.dateFlexibility==="open")maxSet(positive,"all_weather",.38);
}

const normalized=(value:string)=>value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
const terms:Partial<Record<V23SemanticDimension,RegExp>>={
 boutique:/\b(?:boutique|design(?:[- ]led)?|small design hotel)\b|μπουτικ|σχεδιαστικ/i,
 resort:/\b(?:resort|all inclusive)\b|θερετρ/i,
 luxury:/\b(?:luxury|luxurious|premium|five star|5 star)\b|πολυτελ/i,
 value:/\b(?:value|budget|affordable|cheap)\b|οικονομικ|φθην/i,
 low_effort:/\b(?:easy access|easy transfer|little driving|low driving|nearby|close)\b|ευκολ.{0,12}(?:προσβ|μεταβ)|λιγ.{0,12}οδηγ|κοντιν/i,
 warm_climate:/\b(?:warm climate|sunny|mild weather|warm weather)\b|ζεστ.{0,10}(?:καιρ|κλιμ)|ηλιο/i,
 all_weather:/\b(?:year round|all weather|off season)\b|ολο.{0,10}χρονο|εκτος.{0,10}σεζον/i,
 beach_season:/\b(?:beach|swimming|sea|seaside)\b|παραλι|μπανι|θαλασσ/i,
 couple:/\b(?:couple|two of us)\b|ζευγαρ/i,
 family:/\b(?:family|kids|children)\b|οικογεν|παιδι/i,
 solo:/\bsolo\b|μονος|μονη/i,
 friends:/\b(?:friends|group trip)\b|παρεα/i,
 wellness:/\b(?:wellness|spa|switch off)\b|ευεξ|σπα/i,
 nightlife:/\b(?:nightlife|party|clubs?)\b|νυχτεριν|παρτι/i,
 food:/\b(?:food|gastronomy|restaurants?|tavernas?|wine)\b|φαγητ|γαστρονομ|ταβερν|κρασι/i,
 culture:/\b(?:culture|heritage|history|old town|museums?)\b|πολιτισ|ιστορ|παλια πολη|μουσει/i,
 nature:/\b(?:nature|mountain|forest|lake|landscape|hiking)\b|φυση|βουνο|δασ|λιμν|πεζοπορ/i,
 relax:/\b(?:relax|quiet|calm|slow rhythm)\b|χαλαρ|ησυχ|ηρεμ/i,
 city:/\b(?:city|urban|walkable city)\b|πολη|αστικ/i,
 romantic:/\b(?:romantic|romance)\b|ρομαντ/i,
 adventure:/\b(?:adventure|activities|active|outdoor)\b|περιπετ|δραστηριοτ/i,
};
function applyExtraFreeText(text:string,positive:Partial<Record<V23SemanticDimension,number>>,negative:Partial<Record<V23SemanticDimension,number>>){
 const n=normalized(text),clauses=n.split(/[,;]|\b(?:but|and|however)\b|\b(?:αλλα|και|ομως)\b/).map(x=>x.trim()).filter(Boolean);
 for(const [dimension,pattern] of Object.entries(terms) as Array<[V23SemanticDimension,RegExp]>){
  for(const clause of clauses){pattern.lastIndex=0;if(!pattern.test(clause))continue;const negated=/(?:\b(?:no|not|without|avoid|exclude)\b|(?:οχι|χωρις|αποφυγ))/i.test(clause);maxSet(negated?negative:positive,dimension,negated ? .9 : .72);}
 }
}

export function buildFuzzyContractV23(request:TripRequest,legacy?:V8SemanticIntent):V23FuzzyIntentContract{
 const positive:Partial<Record<V23SemanticDimension,number>>={},negative:Partial<Record<V23SemanticDimension,number>>={};
 applyStructured(request,positive);applyLegacySemantic(positive,negative,legacy);if(request.tripText)applyExtraFreeText(request.tripText,positive,negative);
 const qualifiers={avoidCrowds:legacy?.qualifiers.avoidCrowds??(request.avoid==="crowds" ? .82 : 0),easyAccess:legacy?.qualifiers.easyAccess??0,slowRhythm:legacy?.qualifiers.slowRhythm??0,walkable:legacy?.qualifiers.walkable??0,localCharacter:legacy?.qualifiers.localCharacter??0};
 if(qualifiers.easyAccess>0)maxSet(positive,"low_effort",.92*qualifiers.easyAccess);
 if(qualifiers.walkable>0){maxSet(positive,"city",.46*qualifiers.walkable);maxSet(positive,"low_effort",.32*qualifiers.walkable);}
 if(qualifiers.localCharacter>0)maxSet(positive,"culture",.72*qualifiers.localCharacter);
 const priorities=(legacy?.priorities??[]).map(d=>legacyMap[d]).filter((d):d is V23SemanticDimension=>Boolean(d));
 return{positive,negative,priorities:[...new Set(priorities)],qualifiers,confidence:legacy?.confidence??(request.tripText?.trim() ? .75 : 1),source:legacy?.source??"structured",positiveVector:vectorFromSemanticMapV23(positive),negativeVector:vectorFromSemanticMapV23(negative)};
}

export function mergeFuzzyContractV23(base:V23FuzzyIntentContract,parsed:{positive?:Partial<Record<V23SemanticDimension,number>>;negative?:Partial<Record<V23SemanticDimension,number>>;priorities?:V23SemanticDimension[];qualifiers?:Partial<V23FuzzyIntentContract["qualifiers"]>;confidence?:number},source:V23FuzzyIntentContract["source"]):V23FuzzyIntentContract{
 const positive={...base.positive},negative={...base.negative};for(const [d,v] of Object.entries(parsed.positive??{}) as Array<[V23SemanticDimension,number]>){if(v>0)maxSet(positive,d,v);}for(const [d,v] of Object.entries(parsed.negative??{}) as Array<[V23SemanticDimension,number]>){if(v>0)maxSet(negative,d,v);}
 for(const d of V23_SEMANTIC_DIMENSIONS){if((negative[d]??0)>=.78&&(positive[d]??0)>.45)positive[d]=.45;}
 const priorities=parsed.priorities?.length?[...new Set(parsed.priorities)]:base.priorities,qualifiers={...base.qualifiers,...parsed.qualifiers};
 if(qualifiers.easyAccess>0)maxSet(positive,"low_effort",.95*qualifiers.easyAccess);if(qualifiers.localCharacter>0)maxSet(positive,"culture",.76*qualifiers.localCharacter);if(qualifiers.walkable>0)maxSet(positive,"city",.5*qualifiers.walkable);
 return{positive,negative,priorities,qualifiers,confidence:clamp01(parsed.confidence??base.confidence),source,positiveVector:vectorFromSemanticMapV23(positive),negativeVector:vectorFromSemanticMapV23(negative)};
}

export function fuzzyVectorFitV23(candidate:number[],contract:V23FuzzyIntentContract){
 if(candidate.length!==24)return{fit:.5,weighted:.5,priorityFloor:.5,negativeConflict:0,activeCriteria:0};
 let sum=0,weights=0,negativeConflict=0,negativeWeights=0;const prioritySet=new Map(contract.priorities.slice(0,4).map((d,i)=>[d,[2.15,1.65,1.35,1.18][i]]));
 for(const d of V23_SEMANTIC_DIMENSIONS){const c=clamp01(Number(candidate[idx[d]]??.5)),p=clamp01(contract.positive[d]??0),n=clamp01(contract.negative[d]??0),priority=prioritySet.get(d)??1;if(p>=.08){const w=p*priority;sum+=c*w;weights+=w;}if(n>=.08){const w=n*(n>=.85?1.35:1);sum+=(1-c)*w;weights+=w;negativeConflict+=c*w;negativeWeights+=w;}}
 const weighted=weights?sum/weights:.5,priorityValues=contract.priorities.slice(0,3).filter(d=>(contract.positive[d]??0)>=.3).map(d=>clamp01(Number(candidate[idx[d]]??.5))),priorityFloor=priorityValues.length?Math.min(...priorityValues):weighted,fit=clamp01(weighted*.74+priorityFloor*.26);
 return{fit,weighted,priorityFloor,negativeConflict:negativeWeights?negativeConflict/negativeWeights:0,activeCriteria:weights};
}

export function compactFuzzyContractV23(contract:V23FuzzyIntentContract){return{positiveVector:contract.positiveVector.map(v=>Number(v.toFixed(3))),negativeVector:contract.negativeVector.map(v=>Number(v.toFixed(3))),priorities:contract.priorities.slice(0,5),qualifiers:contract.qualifiers,confidence:Number(contract.confidence.toFixed(3)),source:contract.source};}
