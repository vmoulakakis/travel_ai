import type { GuruRecommendation } from "@/lib/decision/types";
import type { TripRequest } from "@/lib/validation/trip";
import { deterministicGuruFallback, type RankedAffiliateCandidate } from "@/lib/decision/affiliate-engine";

type GuruJson={picks?:Array<{destination_id?:string;role?:string;why_this_place?:string;why_now?:string;tags?:string[];confidence?:"HIGH"|"MEDIUM"|"LOW"}>};
type DeepSeekResponse={choices?:Array<{message?:{content?:string|null;reasoning_content?:string|null}}>};
const clean=(v:unknown,max=220)=>typeof v==="string"?v.trim().slice(0,max):"";
const roles=new Set(["GURU PICK","BEST MATCH","WEATHER FIT","LUXURY DEPTH","BEST VALUE","EASY ESCAPE","ROMANTIC FIT","SMART ALTERNATIVE","WILDCARD"]);
function config(){return{apiKey:process.env.DEEPSEEK_API_KEY,baseUrl:process.env.DEEPSEEK_BASE_URL||"https://api.deepseek.com",model:process.env.DEEPSEEK_MODEL||"deepseek-v4-pro",effort:process.env.DEEPSEEK_REASONING_EFFORT==="max"?"max":"high"} as const}
function priceLabel(item:RankedAffiliateCandidate){const c=item.candidate;if(c.minPrice==null)return"Price not supplied";const prefix=c.currency?`${c.currency} `:"feed price ";return`${prefix}${Math.round(c.minPrice)}${c.medianPrice!=null&&c.medianPrice!==c.minPrice?`–${Math.round(c.medianPrice)}`:""}`}
function norm(v:string){return v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zα-ω0-9]+/gi," ").trim()}
function overlaps(a:string,b:string){const x=norm(a),y=norm(b);if(x===y||x.includes(y)||y.includes(x))return true;const xa=x.split(" ").filter(v=>v.length>4),ya=y.split(" ").filter(v=>v.length>4);return xa.filter(v=>ya.includes(v)).length>=2}

export function deepSeekNeeded(request:TripRequest,ranked:RankedAffiliateCandidate[]):boolean{
  if(ranked.length<6)return false;
  const topGap=Math.abs(ranked[0].score-ranked[1].score),boundaryGap=Math.abs(ranked[4].score-ranked[5].score);
  const mixedIntent=request.moods.length>=2;
  const closeSemantic=Math.abs(ranked[0].breakdown.semantic-ranked[1].breakdown.semantic)<5;
  const tradeoff=ranked.slice(0,5).some(x=>Math.abs(x.breakdown.semantic-x.breakdown.weather)>28||Math.abs(x.breakdown.semantic-x.breakdown.effort)>35);
  return topGap<3||boundaryGap<2||(mixedIntent&&closeSemantic)||tradeoff;
}

function build(item:RankedAffiliateCandidate,pick:NonNullable<GuruJson["picks"]>[number],index:number):GuruRecommendation{
  const c=item.candidate,rawRole=clean(pick.role,40).toUpperCase(),role=roles.has(rawRole)?rawRole:index===0?"GURU PICK":"SMART ALTERNATIVE";
  const confidence=pick.confidence==="HIGH"||pick.confidence==="MEDIUM"||pick.confidence==="LOW"?pick.confidence:item.breakdown.semantic>=78&&c.weather?.confidence!=="LOW"?"HIGH":item.breakdown.semantic>=62?"MEDIUM":"LOW";
  const tags=Array.isArray(pick.tags)?pick.tags.map(t=>clean(t,28).toLowerCase()).filter(Boolean).slice(0,4):[];
  return{destinationId:c.destinationId,destination:c.locationLabel,country:c.countryHint??"Feed location",role,score:Math.round(item.score),confidence,
    whyThisPlace:clean(pick.why_this_place)||`${c.locationLabel} matches the semantic profile and exact-date feasibility.`,whyNow:clean(pick.why_now)||`${c.activeOfferCount} tracked stays overlap the exact dates.`,
    tags:tags.length?tags:[...(c.semanticProfile?.archetypes??[]).slice(0,2),"semantic match"],imageUrl:c.heroImageUrl,feedPriceLabel:priceLabel(item),propertyCount:c.propertyCount,activeOfferCount:c.activeOfferCount,fiveStarOfferCount:c.fiveStarOfferCount,alternativeOfferCount:c.alternativeOfferCount,demandScore:Math.round(c.demandScore),maxDiscount:c.maxDiscount,latitude:c.latitude,longitude:c.longitude,distanceKm:item.distanceKm==null?null:Math.round(item.distanceKm),breakdown:item.breakdown,offers:c.topOffers.slice(0,5),weather:c.weather,verifier:{checked:false,passed:true,reason:null,model:null}};
}

const SYSTEM=`You are a compact Travel Decision Judge. A semantic/neural engine has already performed discovery, exact-date inventory checks, weather screening and seasonality filtering. You are only a tie-break judge for ambiguous top candidates and a concise explanation writer. Use only supplied IDs and facts. Do not invent flights, ferry schedules, weather, hotel availability, ratings, prices or demand. Prefer semantic fit + seasonality + weather; effort/value resolve close ties. Return JSON only. Never reveal chain-of-thought.`;

export async function runTravelGuru(request:TripRequest,ranked:RankedAffiliateCandidate[]):Promise<{mode:"semantic-neural-deepseek"|"semantic-neural"|"deterministic-affiliate-fallback";recommendations:GuruRecommendation[]}>{
  const fallback=deterministicGuruFallback(request,ranked),c=config();
  if(ranked.length<5)return{mode:"deterministic-affiliate-fallback",recommendations:fallback};
  if(!c.apiKey||!deepSeekNeeded(request,ranked))return{mode:"semantic-neural",recommendations:fallback};
  const shortlist=ranked.slice(0,8);
  const data=shortlist.map(({candidate,score,distanceKm,breakdown})=>({id:candidate.destinationId,place:candidate.locationLabel,score:Math.round(score),km:distanceKm==null?null:Math.round(distanceKm),semantic:breakdown.semantic,neural:breakdown.neural,weather:breakdown.weather,season:breakdown.seasonality,effort:breakdown.effort,value:breakdown.value,stay:breakdown.stayFit,offers:candidate.activeOfferCount,archetypes:candidate.semanticProfile?.archetypes??[]}));
  const outputLanguage=request.language==="en"?"English":"Greek";
  const prompt=`TRIP ${request.startDate}..${request.endDate}; origin=${request.origin}; nights=${request.nights}; budget=${request.budget}; moods=${request.moods.join(",")}; traveler=${request.travelerType}; distance=${request.distancePreference}; hotel=${request.hotelStyle}; avoid=${request.avoid}. CANDIDATES=${JSON.stringify(data)}. Select exactly 5 distinct IDs. Do not choose a materially worse season/weather candidate only for supply. Write two very short reasons in ${outputLanguage}. Return {"picks":[{"destination_id":"id","role":"GURU PICK|BEST MATCH|WEATHER FIT|LUXURY DEPTH|BEST VALUE|EASY ESCAPE|SMART ALTERNATIVE|WILDCARD","why_this_place":"...","why_now":"...","tags":["...","..."],"confidence":"HIGH|MEDIUM|LOW"},...5]}.`;
  try{
    const response=await fetch(`${c.baseUrl}/chat/completions`,{method:"POST",headers:{Authorization:`Bearer ${c.apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:c.model,messages:[{role:"system",content:SYSTEM},{role:"user",content:prompt}],reasoning_effort:c.effort,thinking:{type:"enabled"},response_format:{type:"json_object"},max_tokens:560}),signal:AbortSignal.timeout(7500)});
    if(!response.ok)return{mode:"semantic-neural",recommendations:fallback};
    const payload=await response.json() as DeepSeekResponse,content=payload.choices?.[0]?.message?.content;if(!content)return{mode:"semantic-neural",recommendations:fallback};
    const parsed=JSON.parse(content) as GuruJson;if(!Array.isArray(parsed.picks)||parsed.picks.length!==5)return{mode:"semantic-neural",recommendations:fallback};
    const ids=parsed.picks.map(p=>clean(p.destination_id,100));if(new Set(ids).size!==5)return{mode:"semantic-neural",recommendations:fallback};
    const lookup=new Map(shortlist.map(item=>[item.candidate.destinationId,item]));if(ids.some(id=>!lookup.has(id)))return{mode:"semantic-neural",recommendations:fallback};
    const selected=ids.map(id=>lookup.get(id) as RankedAffiliateCandidate);for(let i=0;i<selected.length;i++)for(let j=i+1;j<selected.length;j++)if(overlaps(selected[i].candidate.locationLabel,selected[j].candidate.locationLabel))return{mode:"semantic-neural",recommendations:fallback};
    return{mode:"semantic-neural-deepseek",recommendations:parsed.picks.map((pick,index)=>build(selected[index],pick,index))};
  }catch{return{mode:"semantic-neural",recommendations:fallback}}
}
