import type { StayConstraintKind,StayConstraintSpec } from "@/lib/decision/v8-types";
import { parseStayConstraintsV16,STAY_CONSTRAINT_KINDS_V16,STAY_EXCLUSIVE_V16,STAY_NOUN_V16 } from "@/lib/decision/stay-constraints-v16";
import { createLLMRequestBudgetV16,generateJsonWithRoutingV16,type LLMRequestBudgetV16,type ModelTierV16 } from "@/lib/ai/model-router-v9";

const unique=<T,>(values:T[])=>[...new Set(values)];
const norm=(value:string)=>value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
const tierSource=(tier:ModelTierV16):StayConstraintSpec["source"]=>tier==="free"?"deterministic+free":tier==="openai"?"deterministic+openai":"deterministic+deepseek";

export async function interpretStayConstraintsV16(raw:string|undefined|null,budget:LLMRequestBudgetV16=createLLMRequestBudgetV16()):Promise<StayConstraintSpec>{
 const base=parseStayConstraintsV16(raw),text=(raw??"").trim();
 if(!text||(!base.needsSemanticAssist&&base.confidence==="HIGH"))return base;
 const normalized=norm(text),hasExclusive=STAY_EXCLUSIVE_V16.test(normalized),hardRisk=hasExclusive&&STAY_NOUN_V16.test(normalized);
 const routed=await generateJsonWithRoutingV16<{hard:StayConstraintKind[];soft:StayConstraintKind[];confidence:"HIGH"|"MEDIUM"}>({
  context:{task:"stay-constraints",text,deterministicConfidence:base.confidence==="HIGH"?.96:.62,hardConstraintRisk:hardRisk,contradictorySignals:base.needsSemanticAssist&&base.hard.length>0&&base.soft.length>0},budget,
  system:`Classify only accommodation/stay requirements explicitly present in the user's text. Allowed kinds: ${STAY_CONSTRAINT_KINDS_V16.join(", ")}. HARD means the user explicitly requires it with words such as only, must, without exception, μόνο, οπωσδήποτε. SOFT means a preference. Do not infer hotel facts and do not name destinations. Return JSON only: {"hard":[],"soft":[],"confidence":"HIGH|MEDIUM"}.`,
  prompt:text,
  validate(value){
   const hard=Array.isArray(value.hard)?value.hard.filter((x):x is StayConstraintKind=>typeof x==="string"&&STAY_CONSTRAINT_KINDS_V16.includes(x as StayConstraintKind)):[];
   const soft=Array.isArray(value.soft)?value.soft.filter((x):x is StayConstraintKind=>typeof x==="string"&&STAY_CONSTRAINT_KINDS_V16.includes(x as StayConstraintKind)):[];
   const confidence=value.confidence==="HIGH"?"HIGH":value.confidence==="MEDIUM"?"MEDIUM":null;if(!confidence||(!hard.length&&!soft.length))return null;return{hard,soft,confidence};
  }
 });
 if(!routed)return base;
 const semanticHard=hasExclusive?routed.value.hard:[],hard=unique([...base.hard,...semanticHard]),soft=unique([...base.soft,...routed.value.soft].filter(kind=>!hard.includes(kind)));
 return{hard,soft,confidence:routed.value.confidence,source:tierSource(routed.tier),needsSemanticAssist:false};
}
