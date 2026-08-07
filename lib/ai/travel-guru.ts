import type { GuruRecommendation } from "@/lib/decision/types";
import type { TripRequest } from "@/lib/validation/trip";
import { deterministicGuruFallback, type RankedAffiliateCandidate } from "@/lib/decision/affiliate-engine";

type GuruJson = { picks?: Array<{ destination_id?: string; role?: string; why_this_place?: string; why_now?: string; tags?: string[]; confidence?: "HIGH"|"MEDIUM"|"LOW" }> };
type DeepSeekResponse = { choices?: Array<{ message?: { content?: string | null; reasoning_content?: string | null } }> };

const clean=(v:unknown,max=180)=>typeof v==="string"?v.trim().slice(0,max):"";
const allowedRoles=new Set(["GURU PICK","BEST VALUE","EASY ESCAPE","ROMANTIC FIT","STRONG DEAL SIGNAL","SMART ALTERNATIVE","WILDCARD"]);

function config(){
  return {apiKey:process.env.DEEPSEEK_API_KEY,baseUrl:process.env.DEEPSEEK_BASE_URL||"https://api.deepseek.com",model:process.env.DEEPSEEK_MODEL||"deepseek-v4-pro",effort:process.env.DEEPSEEK_REASONING_EFFORT==="max"?"max":"high"} as const;
}
function feedPriceLabel(item:RankedAffiliateCandidate){
  const c=item.candidate;if(c.minPrice==null)return"Price not supplied";
  const prefix=c.currency?`${c.currency} `:"feed price ";
  return `${prefix}${Math.round(c.minPrice)}${c.medianPrice!=null&&c.medianPrice!==c.minPrice?`–${Math.round(c.medianPrice)}`:""}`;
}
function toRecommendation(item:RankedAffiliateCandidate,pick:NonNullable<GuruJson["picks"]>[number],index:number):GuruRecommendation{
  const c=item.candidate;
  const confidence=pick.confidence==="HIGH"||pick.confidence==="MEDIUM"||pick.confidence==="LOW"?pick.confidence:(c.activeOfferCount>=8?"MEDIUM":"LOW");
  const role=allowedRoles.has(clean(pick.role,40).toUpperCase())?clean(pick.role,40).toUpperCase():(index===0?"GURU PICK":"SMART ALTERNATIVE");
  const tags=Array.isArray(pick.tags)?pick.tags.map(t=>clean(t,24).toLowerCase()).filter(Boolean).slice(0,4):[];
  return {destinationId:c.destinationId,destination:c.locationLabel,country:c.countryHint??"Feed location",role,score:Math.round(item.score),confidence,whyThisPlace:clean(pick.why_this_place,220)||`${c.locationLabel} fits the selected travel intent and current feed signals.`,whyNow:clean(pick.why_now,220)||`${c.activeOfferCount} active tracked offers overlap the requested period.`,tags:tags.length?tags:["feed-backed","active offers"],imageUrl:c.heroImageUrl,feedPriceLabel:feedPriceLabel(item),propertyCount:c.propertyCount,activeOfferCount:c.activeOfferCount,demandScore:Math.round(c.demandScore),maxDiscount:c.maxDiscount,distanceKm:item.distanceKm==null?null:Math.round(item.distanceKm),breakdown:item.breakdown,offers:c.topOffers.slice(0,3)};
}

export async function runTravelGuru(request:TripRequest,ranked:RankedAffiliateCandidate[]):Promise<{mode:"travel-guru-deepseek"|"deterministic-affiliate-fallback";recommendations:GuruRecommendation[]}>{
  const fallback=deterministicGuruFallback(request,ranked);
  const c=config(); if(!c.apiKey||ranked.length<3)return{mode:"deterministic-affiliate-fallback",recommendations:fallback};
  const shortlist=ranked.slice(0,16);
  const data=shortlist.map(({candidate,score,distanceKm,breakdown})=>({
    destination_id:candidate.destinationId,location:candidate.locationLabel,country_hint:candidate.countryHint,
    score:Math.round(score),distance_km:distanceKm==null?null:Math.round(distanceKm),breakdown,
    feed:{property_count:candidate.propertyCount,active_offer_count:candidate.activeOfferCount,min_price:candidate.minPrice,median_price:candidate.medianPrice,max_price:candidate.maxPrice,currency:candidate.currency,demand_score:candidate.demandScore,sale_offer_count:candidate.saleOfferCount,max_discount:candidate.maxDiscount,valid_to_max:candidate.validToMax},
    text_evidence:candidate.semanticText,
    top_offers:candidate.topOffers.map(o=>({product_id:o.sourceProductId,property:o.propertyName,description:o.description,category:o.category,availability:o.availability,valid_from:o.validFrom,valid_to:o.validTo,price:o.price,full_price:o.fullPrice,currency:o.currency,discount:o.discount,demand_signal:o.demandSignal,model_name:o.modelName,brand_name:o.brandName,custom:o.custom,variations:o.variations,extra_images:o.extraImages,tracking_url:o.trackingUrl}))
  }));
  const prompt=`You are Travel Guru, an expert travel decision agent and conversion-aware affiliate curator.\n\nHARD BOUNDARY: You may select ONLY destination_id values present in CANDIDATES. Never add another place. The supplied Linkwise JSON data is authoritative for offers, prices, discounts, validity, images and demand. Currency may be missing: never call a numeric price EUR/€ unless currency is supplied. You may use travel expertise to infer vibe/fit from destination name and hotel mix, but present that as judgement, not a live fact. Never invent flights, ferries, weather, exact total trip cost or availability beyond the feed.\n\nGOAL: choose exactly 3 distinct destinations that best fit the traveler while also having useful current affiliate inventory. Optimize for qualified affiliate intent, not raw clicks. Make the three choices meaningfully different.\n\nTRAVELER:\n${JSON.stringify(request)}\n\nCANDIDATES:\n${JSON.stringify(data)}\n\nReturn strict JSON only: {"picks":[{"destination_id":"exact id","role":"GURU PICK|BEST VALUE|EASY ESCAPE|ROMANTIC FIT|STRONG DEAL SIGNAL|SMART ALTERNATIVE|WILDCARD","why_this_place":"one concise sentence","why_now":"one concise source-grounded sentence","tags":["2-4 short tags"],"confidence":"HIGH|MEDIUM|LOW"}, ... exactly 3]}.`;
  try{
    const response=await fetch(`${c.baseUrl}/chat/completions`,{method:"POST",headers:{Authorization:`Bearer ${c.apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:c.model,messages:[{role:"system",content:"Stay inside the supplied affiliate destination universe. Facts before persuasion. Never invent travel inventory or links."},{role:"user",content:prompt}],reasoning_effort:c.effort,thinking:{type:"enabled"},response_format:{type:"json_object"},max_tokens:1400}),signal:AbortSignal.timeout(20000)});
    if(!response.ok)return{mode:"deterministic-affiliate-fallback",recommendations:fallback};
    const payload=await response.json() as DeepSeekResponse; const content=payload.choices?.[0]?.message?.content;if(!content)return{mode:"deterministic-affiliate-fallback",recommendations:fallback};
    const parsed=JSON.parse(content) as GuruJson; if(!Array.isArray(parsed.picks)||parsed.picks.length!==3)return{mode:"deterministic-affiliate-fallback",recommendations:fallback};
    const ids=parsed.picks.map(p=>clean(p.destination_id,80)); if(new Set(ids).size!==3)return{mode:"deterministic-affiliate-fallback",recommendations:fallback};
    const lookup=new Map(shortlist.map(item=>[item.candidate.destinationId,item])); if(ids.some(id=>!lookup.has(id)))return{mode:"deterministic-affiliate-fallback",recommendations:fallback};
    return{mode:"travel-guru-deepseek",recommendations:parsed.picks.map((pick,index)=>toRecommendation(lookup.get(ids[index]) as RankedAffiliateCandidate,pick,index))};
  }catch{return{mode:"deterministic-affiliate-fallback",recommendations:fallback};}
}
