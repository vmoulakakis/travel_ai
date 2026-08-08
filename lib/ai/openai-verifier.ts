import type { GuruRecommendation } from "@/lib/decision/types";
import type { TripRequest } from "@/lib/validation/trip";
import type { RankedAffiliateCandidate } from "@/lib/decision/affiliate-engine";

type VerifyJson={pass?:boolean;reason?:string;reject_ids?:string[]};
type ResponsesPayload={output_text?:string;output?:Array<{content?:Array<{text?:string}>}>};

function outputText(payload:ResponsesPayload):string{
  if(typeof payload.output_text==="string")return payload.output_text;
  const chunks:string[]=[];for(const item of payload.output??[])for(const part of item.content??[])if(typeof part.text==="string")chunks.push(part.text);return chunks.join("\n").trim();
}
function parseJson(raw:string):VerifyJson{const clean=raw.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"").trim();const a=clean.indexOf("{"),b=clean.lastIndexOf("}");if(a<0||b<=a)return{pass:true};return JSON.parse(clean.slice(a,b+1)) as VerifyJson}

export function verifierNeeded(recommendations:GuruRecommendation[],ranked:RankedAffiliateCandidate[]):boolean{
  if(recommendations.length!==5)return true;
  if(new Set(recommendations.map(x=>x.destinationId)).size!==5)return true;
  if(recommendations.some(x=>x.confidence==="LOW"))return true;
  if(recommendations.slice(0,3).some(x=>x.weather?.source==="unavailable"||x.breakdown.seasonality<58))return true;
  const gap=Math.abs((ranked[0]?.score??0)-(ranked[1]?.score??0));
  const fifthGap=Math.abs((ranked[4]?.score??0)-(ranked[5]?.score??0));
  return gap<2.5||fifthGap<1.5;
}

export async function verifyRecommendations(request:TripRequest,recommendations:GuruRecommendation[],ranked:RankedAffiliateCandidate[]):Promise<{checked:boolean;passed:boolean;reason:string|null;model:string|null}> {
  const key=process.env.OPENAI_API_KEY;if(!key||!verifierNeeded(recommendations,ranked))return{checked:false,passed:true,reason:null,model:null};
  const model=process.env.OPENAI_VERIFY_MODEL||"gpt-5.4-nano";
  const selected=recommendations.map(x=>({id:x.destinationId,place:x.destination,score:x.score,semantic:x.breakdown.semantic,weather:x.breakdown.weather,season:x.breakdown.seasonality,effort:x.breakdown.effort,value:x.breakdown.value,confidence:x.confidence}));
  const alternatives=ranked.slice(0,8).map(x=>({id:x.candidate.destinationId,place:x.candidate.locationLabel,score:Math.round(x.score),semantic:x.breakdown.semantic,weather:x.breakdown.weather,season:x.breakdown.seasonality}));
  const prompt=`You are a cheap final verifier, not the travel planner. Check only for obvious ranking inconsistency. Facts and scores are authoritative. PASS unless a selected item is clearly dominated by an omitted alternative on semantic fit + weather/seasonality without a meaningful effort/value advantage. Never invent travel facts. Request: ${request.startDate}..${request.endDate}; origin=${request.origin}; moods=${request.moods.join(",")}; traveler=${request.travelerType}; budget=${request.budget}. SELECTED=${JSON.stringify(selected)} ALTERNATIVES=${JSON.stringify(alternatives)}. Return JSON only: {"pass":true|false,"reason":"max 100 chars","reject_ids":["id"]}.`;
  try{
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model,input:prompt,reasoning:{effort:"minimal"},max_output_tokens:180,store:false}),signal:AbortSignal.timeout(5500)});
    if(!response.ok)return{checked:false,passed:true,reason:null,model:null};
    const parsed=parseJson(outputText(await response.json() as ResponsesPayload));
    return{checked:true,passed:parsed.pass!==false,reason:typeof parsed.reason==="string"?parsed.reason.slice(0,120):null,model};
  }catch{return{checked:false,passed:true,reason:null,model:null}}
}
