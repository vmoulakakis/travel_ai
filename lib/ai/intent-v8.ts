import type { TripRequest } from "@/lib/validation/trip";
import { V8_DIMENSIONS,type V8Dimension,type V8IntentProfile } from "@/lib/decision/v8-types";

type Parsed={weights?:Partial<Record<V8Dimension,number>>;summary?:string};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const blank=()=>Object.fromEntries(V8_DIMENSIONS.map(k=>[k,0])) as Record<V8Dimension,number>;

export function structuredIntent(request:TripRequest):V8IntentProfile{
 const w=blank();
 for(const mood of request.moods){const map:Record<string,V8Dimension>={romantic:"romantic",relax:"relax",food:"food",culture:"culture",city:"city",nature:"nature",adventure:"adventure",warmth:"warmth"};const d=map[mood];if(d)w[d]=1;}
 if(request.travelerType==="family")w.family=Math.max(w.family,.75);
 if(request.travelerType==="friends")w.nightlife=Math.max(w.nightlife,.35);
 // Stay style is intentionally absent here. Boutique/luxury/resort/value only ranks stays after destination selection.
 if(request.avoid==="high-cost")w.value=Math.max(w.value,.4);
 if(request.distancePreference==="island")w.beach=Math.max(w.beach,.5);
 if(request.pace==="slow"){w.relax=Math.max(w.relax,.35);w.wellness=Math.max(w.wellness,.2);}
 if(request.pace==="full"){w.city=Math.max(w.city,.25);w.culture=Math.max(w.culture,.25);w.adventure=Math.max(w.adventure,.2);}
 if(request.nights<=4)w.short_break=Math.max(w.short_break,.55);
 const month=Number(request.startDate.slice(5,7));if(month===4||month===5||month===9||month===10||month===11)w.shoulder_season=Math.max(w.shoulder_season,.25);
 if(request.moods.includes("warmth"))w.beach=Math.max(w.beach,.45);
 return{weights:w,source:"structured",summary:request.moods.join(" + ")};
}

export async function interpretIntentV8(request:TripRequest):Promise<V8IntentProfile>{
 const base=structuredIntent(request),text=request.tripText?.trim();if(!text||text.length<8)return base;
 const key=process.env.DEEPSEEK_API_KEY;if(!key)return base;
 const model=process.env.DEEPSEEK_MODEL||"deepseek-v4-pro",url=`${process.env.DEEPSEEK_BASE_URL||"https://api.deepseek.com"}/chat/completions`;
 const system=`You are a semantic travel-intent parser, not a destination recommender. Convert the user's free text into preference weights only. Never name destinations, hotels, flights, prices, routes or weather. Dimensions: ${V8_DIMENSIONS.join(", ")}. Return JSON only: {"weights":{"dimension":0..1},"summary":"max 90 chars"}. Use only dimensions clearly supported by the text.`;
 try{
  const response=await fetch(url,{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model,messages:[{role:"system",content:system},{role:"user",content:text}],thinking:{type:"enabled"},reasoning_effort:"high",response_format:{type:"json_object"},max_tokens:260}),signal:AbortSignal.timeout(5000)});
  if(!response.ok)return base;const payload=await response.json() as {choices?:Array<{message?:{content?:string|null}}>},raw=payload.choices?.[0]?.message?.content;if(!raw)return base;const parsed=JSON.parse(raw) as Parsed,weights={...base.weights};
  if(parsed.weights&&typeof parsed.weights==="object")for(const d of V8_DIMENSIONS){const v=Number(parsed.weights[d]);if(Number.isFinite(v)&&v>0)weights[d]=Math.max(weights[d],clamp(v)*.72);}
  for(const mood of request.moods){const m:Record<string,V8Dimension>={romantic:"romantic",relax:"relax",food:"food",culture:"culture",city:"city",nature:"nature",adventure:"adventure",warmth:"warmth"};const d=m[mood];if(d)weights[d]=Math.max(weights[d],.9);}
  return{weights,source:"structured+deepseek",summary:typeof parsed.summary==="string"?parsed.summary.slice(0,100):base.summary,interpretedText:text};
 }catch{return base}
}
