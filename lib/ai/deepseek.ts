import type { TripRecommendation } from "@/lib/decision/types";
import type { TripRequest } from "@/lib/validation/trip";

interface DeepSeekResponse { choices?: Array<{ message?: { content?: string | null; reasoning_content?: string | null } }> }
function config(){ return { apiKey:process.env.DEEPSEEK_API_KEY, baseUrl:process.env.DEEPSEEK_BASE_URL||"https://api.deepseek.com", model:process.env.DEEPSEEK_MODEL||"deepseek-v4-pro", effort:process.env.DEEPSEEK_REASONING_EFFORT==="max"?"max":"high" } as const; }

export async function enrichRecommendations(request:TripRequest,recommendations:TripRecommendation[]):Promise<TripRecommendation[]>{
  const c=config(); if(!c.apiKey)return recommendations;
  const evidence=recommendations.map(r=>({destination:r.destination,score:r.score,confidence:r.confidence,tags:r.tags,estimatedBudget:r.estimatedBudget,freshness:r.freshness,risk:r.risk,breakdown:r.breakdown}));
  const prompt=`You are the explanation layer of a travel decision engine. Facts and ranking are already decided by deterministic code.\nUser request:\n${JSON.stringify(request)}\nThree ranked recommendations:\n${JSON.stringify(evidence)}\nReturn strict JSON with key \"reasons\", an array of exactly 3 objects: {\"destination\": string, \"reason\": string}. Each reason must be one concise, useful, non-salesy sentence. Never invent routes, exact temperatures, fares, availability, discounts, schedules or live facts. Mention uncertainty naturally when evidence is stale or estimated.`;
  try{
    const response=await fetch(`${c.baseUrl}/chat/completions`,{method:"POST",headers:{Authorization:`Bearer ${c.apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:c.model,messages:[{role:"system",content:"Facts before persuasion. Never create travel facts not present in supplied evidence."},{role:"user",content:prompt}],reasoning_effort:c.effort,thinking:{type:"enabled"},response_format:{type:"json_object"},max_tokens:900}),signal:AbortSignal.timeout(18000)});
    if(!response.ok)return recommendations; const data=await response.json() as DeepSeekResponse; const content=data.choices?.[0]?.message?.content; if(!content)return recommendations; const parsed=JSON.parse(content) as {reasons?:Array<{destination?:string;reason?:string}>}; if(!Array.isArray(parsed.reasons)||parsed.reasons.length!==3)return recommendations;
    return recommendations.map(r=>{const match=parsed.reasons?.find(x=>x.destination===r.destination);return match?.reason?{...r,reason:match.reason}:r;});
  }catch{return recommendations;}
}
