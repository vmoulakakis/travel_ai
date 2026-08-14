import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

export type CouncilModelPreference = "creative" | "critical";
export type ModelTierV16="free"|"deepseek"|"openai";
export type SemanticTaskV16="intent"|"stay-constraints"|"research"|"council"|"verification";
export interface RoutingContextV16{
 task:SemanticTaskV16;
 text?:string|null;
 deterministicConfidence?:number;
 hardConstraintRisk?:boolean;
 contradictorySignals?:boolean;
}
export interface RoutedModelV16{tier:ModelTierV16;model:LanguageModel;maxOutputTokens:number;timeoutMs:number;label:string;}
export interface LLMRequestBudgetV16{
 reserve:(route:RoutedModelV16,steps?:number)=>boolean;
 snapshot:()=>{freeCalls:number;paidCalls:number;openAICalls:number;reservedOutputTokens:number};
}

const envNumber=(name:string,fallback:number,min:number,max:number)=>{const value=Number(process.env[name]);return Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback};
const clamp=(value:number)=>Math.max(0,Math.min(1,value));

function deepSeekModel(): LanguageModel | null {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;
  const provider = createOpenAICompatible({
    name: "travel-reasoner",
    apiKey,
    baseURL: `${process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"}`.replace(/\/$/, ""),
    supportsStructuredOutputs: false,
    transformRequestBody: body => ({ ...body, thinking: { type: "disabled" } }),
  });
  return provider(process.env.DEEPSEEK_COUNCIL_MODEL || "deepseek-v4-flash");
}

function openAIModel(): LanguageModel | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || process.env.OPENAI_ESCALATION_ENABLED==="false") return null;
  const provider = createOpenAI({ apiKey });
  return provider(process.env.OPENAI_COUNCIL_MODEL || process.env.OPENAI_VERIFY_MODEL || "gpt-5-nano");
}

function selfHostedModel(): LanguageModel | null {
  const baseURL = process.env.SELF_HOSTED_AI_BASE_URL;
  const model = process.env.SELF_HOSTED_AI_MODEL;
  if (!baseURL || !model) return null;
  const provider = createOpenAICompatible({
    name: "travel-local",
    apiKey: process.env.SELF_HOSTED_AI_API_KEY || "local",
    baseURL: baseURL.replace(/\/$/, ""),
    supportsStructuredOutputs: false,
  });
  return provider(model);
}

function huggingFaceModel():LanguageModel|null{
 const apiKey=process.env.HF_TOKEN||process.env.HUGGINGFACE_API_KEY;
 if(!apiKey)return null;
 const provider=createOpenAICompatible({name:"travel-open-model",apiKey,baseURL:(process.env.HF_ROUTER_BASE_URL||"https://router.huggingface.co/v1").replace(/\/$/,""),supportsStructuredOutputs:false});
 return provider(process.env.HF_FREE_MODEL||"Qwen/Qwen2.5-7B-Instruct-1M:cheapest");
}

export function semanticRiskV16(context:RoutingContextV16){
 const text=(context.text??"").toLowerCase(),confidence=clamp(context.deterministicConfidence??.8);
 let risk=(1-confidence)*.58;
 if(context.hardConstraintRisk)risk+=.24;
 if(context.contradictorySignals)risk+=.18;
 if(/\b(?:μονο|only|mono|χωρις|without|εκτος|except|must|οπωσδηποτε)\b/.test(text))risk+=.12;
 if((text.match(/(?:,| και | and | αλλα | but | χωρις | without )/g)??[]).length>=3)risk+=.08;
 if(text.length>150)risk+=.06;
 if(/[a-z].*[α-ω]|[α-ω].*[a-z]/i.test(text))risk+=.05;
 return clamp(risk);
}

export function routingDecisionV16(context:RoutingContextV16){
 const risk=semanticRiskV16(context);
 const deterministicThreshold=envNumber("LLM_DETERMINISTIC_CONFIDENCE_THRESHOLD",.93,.5,1);
 const deepSeekThreshold=envNumber("LLM_DEEPSEEK_RISK_THRESHOLD",.68,.2,1);
 const openAIThreshold=envNumber("LLM_OPENAI_RISK_THRESHOLD",.9,.4,1);
 const confidence=clamp(context.deterministicConfidence??.8);
 return{
  risk,
  useAnyModel:confidence<deterministicThreshold||context.hardConstraintRisk===true||context.contradictorySignals===true,
  allowDeepSeek:risk>=deepSeekThreshold||context.hardConstraintRisk===true,
  allowOpenAI:risk>=openAIThreshold&&(context.hardConstraintRisk===true||context.contradictorySignals===true),
 };
}

export function routedModelsV16(context:RoutingContextV16,preference:CouncilModelPreference="critical"):RoutedModelV16[]{
 const decision=routingDecisionV16(context);
 if(!decision.useAnyModel)return[];
 const freeMax=envNumber("FREE_LLM_MAX_OUTPUT_TOKENS",180,64,600),deepMax=envNumber("DEEPSEEK_MAX_OUTPUT_TOKENS",240,64,800),openMax=envNumber("OPENAI_MAX_OUTPUT_TOKENS",180,64,600);
 const free=[selfHostedModel(),huggingFaceModel()].filter((model):model is LanguageModel=>Boolean(model)).map((model,index)=>({tier:"free" as const,model,maxOutputTokens:freeMax,timeoutMs:envNumber("FREE_LLM_TIMEOUT_MS",6500,1000,20000),label:index===0?"self-hosted":"huggingface-open-model"}));
 const paid:RoutedModelV16[]=[];
 if(decision.allowDeepSeek){const model=deepSeekModel();if(model)paid.push({tier:"deepseek",model,maxOutputTokens:deepMax,timeoutMs:envNumber("DEEPSEEK_TIMEOUT_MS",6500,1000,20000),label:"deepseek"});}
 if(decision.allowOpenAI){const model=openAIModel();if(model)paid.push({tier:"openai",model,maxOutputTokens:openMax,timeoutMs:envNumber("OPENAI_TIMEOUT_MS",5000,1000,15000),label:"openai"});}
 // Free/open models are always attempted before paid providers. Preference only
 // changes the paid verifier ordering when both are permitted.
 return preference==="creative"?[...free,...paid]:[...free,...paid];
}

export function createLLMRequestBudgetV16():LLMRequestBudgetV16{
 const maxFree=envNumber("LLM_MAX_FREE_CALLS_PER_REQUEST",4,0,12),maxPaid=envNumber("LLM_MAX_PAID_CALLS_PER_REQUEST",2,0,8),maxOpenAI=envNumber("LLM_MAX_OPENAI_CALLS_PER_REQUEST",1,0,4),maxOutput=envNumber("LLM_MAX_RESERVED_OUTPUT_TOKENS_PER_REQUEST",1000,128,5000);
 let freeCalls=0,paidCalls=0,openAICalls=0,reservedOutputTokens=0;
 return{
  reserve(route,steps=1){
   const calls=Math.max(1,Math.min(3,steps)),tokens=route.maxOutputTokens*calls;
   if(reservedOutputTokens+tokens>maxOutput)return false;
   if(route.tier==="free"){if(freeCalls+calls>maxFree)return false;freeCalls+=calls;}
   else{if(paidCalls+calls>maxPaid)return false;if(route.tier==="openai"&&openAICalls+calls>maxOpenAI)return false;paidCalls+=calls;if(route.tier==="openai")openAICalls+=calls;}
   reservedOutputTokens+=tokens;return true;
  },
  snapshot:()=>({freeCalls,paidCalls,openAICalls,reservedOutputTokens}),
 };
}

/** Legacy compatibility: free models now lead; paid models are only included when requested. */
export function councilModels(preference: CouncilModelPreference, includeDeepSeek = true): LanguageModel[] {
 const context:RoutingContextV16={task:"council",deterministicConfidence:includeDeepSeek?.7:.88,hardConstraintRisk:includeDeepSeek};
 return routedModelsV16(context,preference).filter(route=>includeDeepSeek||route.tier==="free").map(route=>route.model);
}
