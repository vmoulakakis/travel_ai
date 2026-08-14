import type { TripRequest } from "@/lib/validation/trip";
import { V8_DIMENSIONS,type V8Dimension,type V8IntentProfile } from "@/lib/decision/v8-types";
import { createLLMRequestBudgetV16,generateJsonWithRoutingV16,type LLMRequestBudgetV16,type ModelTierV16 } from "@/lib/ai/model-router-v9";

type Parsed={weights?:Partial<Record<V8Dimension,number>>;summary?:string};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const blank=()=>Object.fromEntries(V8_DIMENSIONS.map(k=>[k,0])) as Record<V8Dimension,number>;
const normalizedFreeText=(value:string)=>value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zα-ω0-9]+/gi," ").replace(/\s+/g," ").trim();
const has=(text:string,pattern:RegExp)=>pattern.test(text);
const knownIntentPattern=/βουνο|ορειν|mountain|vouno|bouno|παραθαλασ|θαλασσ|παραλι|seaside|coast|beach|paralia|thalass|πολη|city|urban|ησυχ|ηρεμι|χαλαρ|quiet|calm|relax|φαγητ|γαστρονομ|food|restaurant|fagit|φυση|nature|fusi|αρχαι|archaeolog|culture|πολιτισ|event|festival|εκδηλω|ρομαντ|romantic|nightlife|βραδιν|adventure|πεζοπορ|ηλιο|warm|παιδι|family|local character|αυθεντικ/i;

function applyFreeTextSignals(w:Record<V8Dimension,number>,raw:string){
 const free=normalizedFreeText(raw);if(!free)return;
 if(has(free,/βουνο|ορειν|mountain|vouno|bouno|orein|orino/)){w.nature=Math.max(w.nature,.92);w.adventure=Math.max(w.adventure,.55);w.wellness=Math.max(w.wellness,.35)}
 if(has(free,/παραθαλασ|θαλασσ|παραλι|seaside|coast|beach|paralia|thalass|thalasa|parathalass|parathalas/))w.beach=Math.max(w.beach,.92);
 if(has(free,/πολη|αστικ|city|urban|\bpoli\b|astik/)){w.city=Math.max(w.city,.88);w.culture=Math.max(w.culture,.4)}
 if(has(free,/ησυχ|ηρεμι|χαλαρ|quiet|calm|relax|isyxi|isixi|irem|xalar|chalar/)){w.relax=Math.max(w.relax,.82);w.wellness=Math.max(w.wellness,.28)}
 if(has(free,/φαγητ|γαστρονομ|food|restaurant|fagit|gastronom|estiatori/))w.food=Math.max(w.food,.84);
 if(has(free,/φυση|φυσικ|nature|\bfusi\b|\bfysi\b|fysh|fysik/))w.nature=Math.max(w.nature,.9);
 if(has(free,/αρχαι|αρχαιολογ|μνημει|πολιτισ|παλια πολη|ancient|archaeolog|historic site|heritage|arxai|archaia|mnimei|politism|palia poli/))w.culture=Math.max(w.culture,.98);
 if(has(free,/εκδηλω|φεστιβαλ|συναυλι|event|festival|concert|ekdilos|synauli|sinavl/)){w.culture=Math.max(w.culture,.86);w.city=Math.max(w.city,.55)}
 if(has(free,/ρομαντ|ζευγαρ|romantic|romance|zeygar|zeugar/))w.romantic=Math.max(w.romantic,.86);
 if(has(free,/βραδιν|νυχτεριν|nightlife|bars?\b|vradin|nyxt|nicht/)){w.nightlife=Math.max(w.nightlife,.72);w.city=Math.max(w.city,.45)}
 if(has(free,/περιπετει|πεζοπορ|adventure|hiking|peripet|pezopor/)){w.adventure=Math.max(w.adventure,.84);w.nature=Math.max(w.nature,.55)}
 if(has(free,/ηλιο|ζεστ|sunny|sun |warm|ilios|zesti|zesto/)){w.warmth=Math.max(w.warmth,.82);w.beach=Math.max(w.beach,.5)}
 if(has(free,/παιδι|οικογεν|with kids|children|family|paidia|paidi|oikogene/))w.family=Math.max(w.family,.9);
 if(has(free,/τοπικ.{0,10}χαρακτηρ|local character|authentic|αυθεντικ|topik.{0,10}xarakt|authent/)){w.culture=Math.max(w.culture,.72);w.value=Math.max(w.value,.2)}
 if(has(free,/χωρις πολ.{0,12}οδηγ|λιγη οδηγ|not much driv|less driv|xwris pol.{0,12}odig|lig.{0,8}odig/)){w.short_break=Math.max(w.short_break,.65);w.relax=Math.max(w.relax,.55)}
}

export function structuredIntent(request:TripRequest):V8IntentProfile{
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
 applyFreeTextSignals(w,request.tripText??"");
 return{weights:w,source:"structured",summary:request.moods.join(" + ")};
}

const tierSource=(tier:ModelTierV16):V8IntentProfile["source"]=>tier==="free"?"structured+free":tier==="openai"?"structured+openai":"structured+deepseek";

export async function interpretIntentV8(request:TripRequest,budget:LLMRequestBudgetV16=createLLMRequestBudgetV16()):Promise<V8IntentProfile>{
 const base=structuredIntent(request),text=request.tripText?.trim();if(!text||text.length<8)return base;
 const normalized=normalizedFreeText(text),known=knownIntentPattern.test(normalized),clauses=(normalized.match(/(?: και | αλλα | χωρις | and | but | without |,)/g)??[]).length;
 const deterministicConfidence=known?(clauses>=3?.82:.95):.58;
 const hardRisk=/\b(?:μονο|only|mono|χωρις|without|must|οπωσδηποτε)\b/i.test(normalized);
 const system=`You are a semantic travel-intent parser, not a destination recommender. Convert free text into preference weights only. Never name destinations, hotels, flights, prices, routes, weather or availability. Dimensions: ${V8_DIMENSIONS.join(", ")}. Return JSON only: {"weights":{"dimension":0..1},"summary":"max 90 chars"}. Use only dimensions clearly supported by the text. Hard exclusions and stay-specific requirements are handled elsewhere; do not convert them into invented destination facts.`;
 const routed=await generateJsonWithRoutingV16<Parsed>({
  context:{task:"intent",text,deterministicConfidence,hardConstraintRisk,contradictorySignals:clauses>=4},budget,system,prompt:text,preference:"critical",
  validate(raw){const weights=raw.weights&&typeof raw.weights==="object"&&!Array.isArray(raw.weights)?raw.weights as Record<string,unknown>:null;if(!weights)return null;const parsed:Parsed={weights:{},summary:typeof raw.summary==="string"?raw.summary.slice(0,100):undefined};for(const d of V8_DIMENSIONS){const value=Number(weights[d]);if(Number.isFinite(value)&&value>=0&&value<=1)(parsed.weights as Partial<Record<V8Dimension,number>>)[d]=value;}return Object.keys(parsed.weights??{}).length?parsed:null;}
 });
 if(!routed)return base;
 const weights={...base.weights};
 if(routed.value.weights)for(const d of V8_DIMENSIONS){const v=Number(routed.value.weights[d]);if(Number.isFinite(v)&&v>0)weights[d]=Math.max(weights[d],clamp(v)*.72);}
 for(const mood of request.moods){const m:Record<string,V8Dimension>={romantic:"romantic",relax:"relax",food:"food",culture:"culture",city:"city",nature:"nature",adventure:"adventure",warmth:"warmth"};const d=m[mood];if(d)weights[d]=Math.max(weights[d],.9);}
 return{weights,source:tierSource(routed.tier),summary:routed.value.summary??base.summary,interpretedText:text};
}
