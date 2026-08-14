import type { TripRequest } from "@/lib/validation/trip";
import { V8_DIMENSIONS,type V8Dimension,type V8IntentProfile,type V8SemanticIntent } from "@/lib/decision/v8-types";
import { createLLMRequestBudgetV16,generateJsonWithRoutingV16,type LLMRequestBudgetV16,type ModelTierV16 } from "@/lib/ai/model-router-v9";

type Parsed={positive?:Partial<Record<V8Dimension,number>>;negative?:Partial<Record<V8Dimension,number>>;priorities?:V8Dimension[];qualifiers?:Partial<V8SemanticIntent["qualifiers"]>;confidence?:number;summary?:string;rationale?:string[]};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const blank=()=>Object.fromEntries(V8_DIMENSIONS.map(k=>[k,0])) as Record<V8Dimension,number>;
const normalizedFreeText=(value:string)=>value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zα-ω0-9]+/gi," ").replace(/\s+/g," ").trim();
const has=(text:string,pattern:RegExp)=>pattern.test(text);
const emptyQualifiers=():V8SemanticIntent["qualifiers"]=>({avoidCrowds:0,easyAccess:0,slowRhythm:0,walkable:0,localCharacter:0});
const mapDimension=(value:unknown):V8Dimension|null=>typeof value==="string"&&(V8_DIMENSIONS as readonly string[]).includes(value)?value as V8Dimension:null;

function baseStructuredWeights(request:TripRequest){
 const w=blank();
 for(const mood of request.moods){const map:Record<string,V8Dimension>={romantic:"romantic",relax:"relax",food:"food",culture:"culture",city:"city",nature:"nature",adventure:"adventure",warmth:"warmth"};const d=map[mood];if(d)w[d]=1;}
 if(request.travelerType==="family")w.family=Math.max(w.family,.75);
 if(request.travelerType==="friends")w.nightlife=Math.max(w.nightlife,.35);
 if(request.avoid==="high-cost")w.value=Math.max(w.value,.4);
 if(request.distancePreference==="island")w.beach=Math.max(w.beach,.5);
 if(request.pace==="slow"){w.relax=Math.max(w.relax,.35);w.wellness=Math.max(w.wellness,.2);}
 if(request.pace==="full"){w.city=Math.max(w.city,.25);w.culture=Math.max(w.culture,.25);w.adventure=Math.max(w.adventure,.2);}
 if(request.desiredEnergy==="restore"){w.relax=Math.max(w.relax,.8);w.wellness=Math.max(w.wellness,.55);w.nature=Math.max(w.nature,.35);}
 if(request.desiredEnergy==="stimulating"){w.adventure=Math.max(w.adventure,.55);w.city=Math.max(w.city,.4);w.culture=Math.max(w.culture,.35);}
 if(request.socialPreference==="quiet"){w.relax=Math.max(w.relax,.55);w.nature=Math.max(w.nature,.35);}
 if(request.socialPreference==="lively"){w.city=Math.max(w.city,.55);w.nightlife=Math.max(w.nightlife,.65);}
 if(request.noveltyPreference==="surprise")w.adventure=Math.max(w.adventure,.45);
 if(request.mustHave==="sea")w.beach=Math.max(w.beach,.95);
 if(request.mustHave==="nature")w.nature=Math.max(w.nature,.95);
 if(request.mustHave==="culture")w.culture=Math.max(w.culture,.95);
 if(request.mustHave==="nightlife")w.nightlife=Math.max(w.nightlife,.95);
 if(request.nights<=4)w.short_break=Math.max(w.short_break,.55);
 const month=Number(request.startDate.slice(5,7));if(month===4||month===5||month===9||month===10||month===11)w.shoulder_season=Math.max(w.shoulder_season,.25);
 if(request.moods.includes("warmth"))w.beach=Math.max(w.beach,.45);
 return w;
}

export function deterministicSemanticIntentV18(raw:string):V8SemanticIntent{
 const text=normalizedFreeText(raw),positive:Partial<Record<V8Dimension,number>>={},negative:Partial<Record<V8Dimension,number>>={},qualifiers=emptyQualifiers(),priorities:V8Dimension[]=[];
 const pos=(d:V8Dimension,v:number)=>positive[d]=Math.max(positive[d]??0,v),neg=(d:V8Dimension,v:number)=>negative[d]=Math.max(negative[d]??0,v),priority=(d:V8Dimension)=>{if(!priorities.includes(d))priorities.push(d)};
 if(!text)return{positive,negative,priorities,qualifiers,confidence:1,source:"structured",rationale:[]};

 if(has(text,/φαγητ|γαστρονομ|food|restaurant|tavern|ταβερν|fagit|fagito|estiatori/))pos("food",.86);
 if(has(text,/πολιτισ|παλια πολη|ιστορ|αρχαι|culture|heritage|historic|politism|palia poli|arxai|archaia/))pos("culture",.98);
 if(has(text,/φυση|nature|fusi|fysi|fysh/))pos("nature",.9);
 if(has(text,/βουνο|ορειν|mountain|vouno|bouno|orein|orino/)){pos("nature",.9);pos("adventure",.42);}
 if(has(text,/θαλασσ|παραλι|beach|sea |seaside|coast|paralia|thalass|thalasa/))pos("beach",.92);
 if(has(text,/πολη|city|urban|\bpoli\b|astik/))pos("city",.88);
 if(has(text,/ησυχ|ηρεμι|χαλαρ|quiet|calm|relax|xalar|chalar|isixi|irem/))pos("relax",.84);
 if(has(text,/ρομαντ|ζευγαρ|romantic|couple|zeygar|zeugar/))pos("romantic",.82);
 if(has(text,/nightlife|βραδιν|νυχτεριν|bars|club|party|vradin|nyxt/))pos("nightlife",.72);
 if(has(text,/πεζοπορ|hiking|adventure|δραστηριοτ|pezopor|peripet/))pos("adventure",.78);
 if(has(text,/ζεστ|ηλιο|warm|sunny|ilios|zesti|zesto/))pos("warmth",.78);
 if(has(text,/παιδι|οικογεν|family|children|kids|paidia|paidi|oikogene/))pos("family",.9);

 if(has(text,/(?:οχι|χωρις|δεν θελω|not|no|without).{0,24}(?:nightlife|βραδιν|νυχτεριν|club|party)/))neg("nightlife",.95);
 if(has(text,/(?:οχι|δεν θελω|not).{0,24}(?:beach holiday|παραλια|παραλι|beach)/))neg("beach",.82);
 if(has(text,/(?:οχι|δεν θελω|not).{0,20}(?:city|πολη|αστικ)/))neg("city",.9);
 if(has(text,/(?:οχι|δεν θελω|not).{0,20}(?:βουνο|mountain|hiking|πεζοπορ)/))neg("adventure",.88);
 if(has(text,/(?:οχι|δεν θελω|not).{0,20}(?:luxury|πολυτελ)/))neg("luxury",.9);

 qualifiers.avoidCrowds=has(text,/tourist trap|τουριστοπαγ|πολυ κοσμο|crowd|not chaos|no party crowds|ησυχα χωρις κοσμο|oxi poly kosmo/)?1:0;
 qualifiers.easyAccess=has(text,/ευκολ.{0,12}προσβ|χωρις.{0,20}δυσκολ.{0,20}μεταβ|λιγη οδηγ|not much driv|easy access|easy transfer|xwris.{0,20}dyskol.{0,20}metav|xwris.{0,18}odig|lig.{0,8}odig/)?1:0;
 qualifiers.slowRhythm=has(text,/slow morning|easy rhythm|χαλαρ.{0,12}ρυθμ|οχι.{0,15}μαραθων|χωρις.{0,15}τρεξ|not rush|marathon|xalara/)?1:0;
 qualifiers.walkable=has(text,/walkable|με τα ποδια|πεζ.{0,8}βολτ|βολτα|volta/)?1:0;
 qualifiers.localCharacter=has(text,/local character|τοπικ.{0,12}χαρακτηρ|αυθεντικ|authentic|not a generic resort|local tavern|topik.{0,12}xarakt/)?1:0;

 if(qualifiers.avoidCrowds){pos("relax",.78);neg("nightlife",Math.max(negative.nightlife??0,.5));}
 if(qualifiers.slowRhythm)pos("relax",.9);
 if(qualifiers.walkable){pos("city",Math.max(positive.city??0,.5));pos("culture",Math.max(positive.culture??0,.42));}
 if(qualifiers.localCharacter)pos("culture",Math.max(positive.culture??0,.75));
 if(qualifiers.easyAccess){pos("short_break",.65);pos("relax",Math.max(positive.relax??0,.55));}

 if(has(text,/food first|φαγητο πρωτ|πρωτα.{0,10}φαγητ/))priority("food");
 if(has(text,/culture first|πολιτισμ.{0,12}πρωτ|πρωτα.{0,12}πολιτισ/))priority("culture");
 if(has(text,/nature first|φυση.{0,12}πρωτ|πρωτα.{0,12}φυση/))priority("nature");
 if(has(text,/relax first|ηρεμι.{0,12}πρωτ|ξεκουρασ.{0,12}πρωτ/))priority("relax");
 for(const d of V8_DIMENSIONS){if((negative[d]??0)>=.75&&(positive[d]??0)>.2)positive[d]=.2;}
 return{positive,negative,priorities,qualifiers,confidence:.72,source:"structured",rationale:["deterministic semantic fallback"]};
}

function semanticFromParsed(parsed:Parsed,fallback:V8SemanticIntent,source:V8SemanticIntent["source"]):V8SemanticIntent{
 const positive={...fallback.positive,...parsed.positive},negative={...fallback.negative,...parsed.negative},qualifiers={...fallback.qualifiers,...parsed.qualifiers};
 for(const d of V8_DIMENSIONS){if((negative[d]??0)>=.75&&(positive[d]??0)>.3)positive[d]=.3;}
 return{positive,negative,priorities:parsed.priorities?.length?parsed.priorities:fallback.priorities,qualifiers,confidence:clamp(parsed.confidence??.9),source,rationale:(parsed.rationale??[]).slice(0,5)};
}

function reconcileWeights(request:TripRequest,semantic:V8SemanticIntent){
 const weights=baseStructuredWeights(request);
 for(const d of V8_DIMENSIONS){const p=clamp(semantic.positive[d]??0),n=clamp(semantic.negative[d]??0);if(p>0)weights[d]=Math.max(weights[d]*.7,p);if(n>0)weights[d]*=1-n*.92;}
 if(semantic.qualifiers.avoidCrowds>0)weights.relax=Math.max(weights.relax,.7*semantic.qualifiers.avoidCrowds);
 if(semantic.qualifiers.slowRhythm>0)weights.relax=Math.max(weights.relax,.82*semantic.qualifiers.slowRhythm);
 if(semantic.qualifiers.walkable>0){weights.city=Math.max(weights.city,.5*semantic.qualifiers.walkable);weights.culture=Math.max(weights.culture,.4*semantic.qualifiers.walkable);}
 if(semantic.qualifiers.localCharacter>0)weights.culture=Math.max(weights.culture,.72*semantic.qualifiers.localCharacter);
 if(semantic.qualifiers.easyAccess>0)weights.short_break=Math.max(weights.short_break,.65*semantic.qualifiers.easyAccess);
 semantic.priorities.slice(0,3).forEach((d,i)=>weights[d]=Math.max(weights[d],[.98,.9,.84][i]));
 if(request.mustHave==="sea")weights.beach=Math.max(weights.beach,.98);
 if(request.mustHave==="nature")weights.nature=Math.max(weights.nature,.98);
 if(request.mustHave==="culture")weights.culture=Math.max(weights.culture,.98);
 if(request.mustHave==="nightlife")weights.nightlife=Math.max(weights.nightlife,.98);
 return weights;
}

export function structuredIntent(request:TripRequest):V8IntentProfile{
 const text=request.tripText?.trim();if(!text)return{weights:baseStructuredWeights(request),source:"structured",summary:request.moods.join(" + ")};
 const semantic=deterministicSemanticIntentV18(text);return{weights:reconcileWeights(request,semantic),source:"structured",summary:request.moods.join(" + "),interpretedText:text,semantic};
}

const tierSource=(tier:ModelTierV16):V8IntentProfile["source"]=>tier==="free"?"structured+free":tier==="openai"?"structured+openai":"structured+deepseek";

export async function interpretIntentV8(request:TripRequest,budget:LLMRequestBudgetV16=createLLMRequestBudgetV16()):Promise<V8IntentProfile>{
 const base=structuredIntent(request),text=request.tripText?.trim();if(!text||text.length<8)return base;const fallback=base.semantic??deterministicSemanticIntentV18(text);
 const system=`You are the canonical semantic parser for a travel decision engine. Parse EVERY clause of the traveller's free text. Do not recommend destinations and do not invent facts. Separate desires from dislikes and exclusions. Preserve priority and trade-offs. "not X" must never become a positive X preference. Hard geography and accommodation constraints are enforced elsewhere. Dimensions: ${V8_DIMENSIONS.join(", ")}. Return JSON only with this schema: {"positive":{"dimension":0..1},"negative":{"dimension":0..1},"priorities":["dimension"],"qualifiers":{"avoidCrowds":0..1,"easyAccess":0..1,"slowRhythm":0..1,"walkable":0..1,"localCharacter":0..1},"confidence":0..1,"summary":"max 120 chars","rationale":["short clause interpretations"]}. Use a dimension only when supported by the user's words. If the user says sea nearby but not a beach holiday, keep beach positive low and beach negative meaningful. If the user says food first but no nightlife, food is a priority and nightlife is negative.`;
 const routed=await generateJsonWithRoutingV16<Parsed>({context:{task:"intent",text,deterministicConfidence:.55,hardConstraintRisk:false,contradictorySignals:true,forceSemantic:true},budget,system,prompt:text,preference:"critical",validate(raw){
  const readMap=(input:unknown)=>{const out:Partial<Record<V8Dimension,number>>={};if(!input||typeof input!=="object"||Array.isArray(input))return out;for(const [k,v] of Object.entries(input as Record<string,unknown>)){const d=mapDimension(k),n=Number(v);if(d&&Number.isFinite(n))out[d]=clamp(n);}return out;};
  const positive=readMap(raw.positive),negative=readMap(raw.negative),priorities=Array.isArray(raw.priorities)?raw.priorities.map(mapDimension).filter((x):x is V8Dimension=>Boolean(x)).slice(0,5):[];
  const qRaw=raw.qualifiers&&typeof raw.qualifiers==="object"&&!Array.isArray(raw.qualifiers)?raw.qualifiers as Record<string,unknown>:{};const qualifiers:Partial<V8SemanticIntent["qualifiers"]>={};for(const key of ["avoidCrowds","easyAccess","slowRhythm","walkable","localCharacter"] as const){const n=Number(qRaw[key]);if(Number.isFinite(n))qualifiers[key]=clamp(n);}
  const confidence=Number(raw.confidence),rationale=Array.isArray(raw.rationale)?raw.rationale.filter((x):x is string=>typeof x==="string").slice(0,5):[];
  if(!Object.keys(positive).length&&!Object.keys(negative).length&&!priorities.length&&!Object.keys(qualifiers).length)return null;
  return{positive,negative,priorities,qualifiers,confidence:Number.isFinite(confidence)?clamp(confidence):.85,summary:typeof raw.summary==="string"?raw.summary.slice(0,120):undefined,rationale};
 }});
 const source=routed?tierSource(routed.tier):"structured",semantic=routed?semanticFromParsed(routed.value,fallback,source):fallback,weights=reconcileWeights(request,semantic);
 return{weights,source,summary:routed?.value.summary??base.summary,interpretedText:text,semantic:{...semantic,source}};
}
