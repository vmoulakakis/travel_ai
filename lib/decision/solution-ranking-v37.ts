import { interpretIntentV8 } from "@/lib/ai/intent-v8";
import { createLLMRequestBudgetV16 } from "@/lib/ai/model-router-v9";
import { loadV8DestinationCatalog } from "@/lib/data/destination-v8";
import { loadGlobalStaysV37,type GlobalStayV37,type V37DateFit,type V37MatchTier } from "@/lib/data/global-stays-v37";
import { preRankV8,toRecommendationsV8 } from "@/lib/decision/v8-matcher";
import { V8_DIMENSIONS,type V8Destination,type V8IntentProfile,type V8Recommendation,type V8RecommendationResponse } from "@/lib/decision/v8-types";
import type { TripRequest } from "@/lib/validation/trip";

export interface RankedStayV37{
 sourceProductId:string;propertyName:string;trackingUrl:string;imageUrl:string|null;price:number|null;fullPrice:number|null;currency:string|null;discountPct:number|null;availability:string|null;inStock:boolean|null;city:string|null;address:string|null;distanceKm:number|null;
 score:number;semanticScore:number;valueScore:number;locationScore:number;evidenceScore:number;dateScore:number;reasons:string[];matchedSignals:string[];tradeoff:string;dateFit:V37DateFit;matchTier:V37MatchTier;
}
export interface EscapeSolutionV37{
 rank:number;forwardRank:number;combinedScore:number;destinationScore:number;stayScore:number;inventoryDepth:number;inventoryCount:number;recommendation:V8Recommendation;stay:RankedStayV37;alternatives:RankedStayV37[];
 reasoning:{destination:string;stay:string;reverse:string;tradeoff:string};
}
export interface EscapeSolutionResponseV37{
 version:37;generatedAt:string;request:TripRequest;profileSummary:string;candidateCount:number;inventoryChecked:number;inventoryOfferCount:number;solutionCount:number;
 sourceMode:"global-exact"|"global-location-recovery"|"global-constraint-recovery"|"global-provider-check";
 relaxationsApplied:string[];diagnostics:{passes:string[];distinctDestinations:number;exactOffers:number;coreOffers:number;providerCheckOffers:number};solutions:EscapeSolutionV37[];
}

const clamp=(v:number,min=0,max=100)=>Math.max(min,Math.min(max,v));
const say=(r:TripRequest,el:string,en:string)=>r.language==="en"?en:el;
const lower=(v:string|null|undefined)=>String(v??"").toLowerCase();
function pct(o:GlobalStayV37){if(o.fullPrice!=null&&o.price!=null&&o.fullPrice>o.price&&o.fullPrice>0)return clamp((o.fullPrice-o.price)/o.fullPrice*100,0,90);if(o.discount!=null&&o.discount>0&&o.discount<=100)return o.discount;return null;}
function haystack(o:GlobalStayV37){return `${o.propertyName} ${o.description??""} ${o.category??""} ${o.city??""} ${o.address??""} ${JSON.stringify(o.raw??{})}`.toLowerCase();}
const signals=[
 {id:"sea",re:/beach|beachfront|seaside|sea view|coast|παραλ|θάλασσ|θαλασσ/i,el:"θάλασσα / παραλία",en:"sea / beach"},
 {id:"nature",re:/garden|forest|mountain|nature|eco|rural|vineyard|κήπ|βουν|φύσ|φυση/i,el:"φύση",en:"nature"},
 {id:"wellness",re:/spa|wellness|massage|thermal|sauna|hamam|hammam|ευεξ/i,el:"wellness / spa",en:"wellness / spa"},
 {id:"romantic",re:/boutique|suite|adults only|romantic|honeymoon|private|μπουτίκ|σουίτα/i,el:"boutique / romantic",en:"boutique / romantic"},
 {id:"family",re:/family|kids|children|apartment|kitchen|family room|παιδ|οικογεν|διαμέρισμα|διαμερισμα/i,el:"family-friendly",en:"family-friendly"},
 {id:"city",re:/old town|historic|centre|center|downtown|city centre|κέντρο|κεντρο|παλιά πόλη|παλια πολη/i,el:"κεντρική / city βάση",en:"central / city base"},
 {id:"pool",re:/pool|swimming|πισίνα|πισινα/i,el:"πισίνα",en:"pool"},
 {id:"luxury",re:/luxury|5 star|5\*|resort|premium|deluxe|πολυτελ/i,el:"premium χαρακτήρα",en:"premium character"},
 {id:"nightlife",re:/nightlife|bar|club|night|βραδ|μπαρ/i,el:"βραδινή ζωή",en:"nightlife"},
 {id:"culture",re:/historic|museum|old town|heritage|castle|ιστορ|μουσεί|μουσει|κάστρο|καστρο/i,el:"κουλτούρα / ιστορία",en:"culture / history"}
] as const;
function wanted(r:TripRequest){const s=new Set<string>();for(const m of r.moods){if(m==="romantic")s.add("romantic");if(m==="nature")s.add("nature");if(m==="city"||m==="food")s.add("city");if(m==="culture")s.add("culture");if(m==="relax")s.add("wellness");if(m==="warmth")s.add("sea");}if(r.mustHave!=="none")s.add(r.mustHave==="nightlife"?"nightlife":r.mustHave);if(r.travelerType==="family")s.add("family");if(r.hotelStyle==="luxury")s.add("luxury");if(r.hotelStyle==="boutique")s.add("romantic");if(r.hotelStyle==="resort")s.add("pool");return s;}
function styleFit(r:TripRequest,text:string){if(!r.hotelStyle||r.hotelStyle==="any")return 0;if(r.hotelStyle==="luxury")return /luxury|5 star|5\*|premium|deluxe|πολυτελ/i.test(text)?10:-5;if(r.hotelStyle==="boutique")return /boutique|suite|design|private|μπουτίκ|σουίτα/i.test(text)?10:-4;if(r.hotelStyle==="resort")return /resort|pool|spa|all inclusive/i.test(text)?10:-4;if(r.hotelStyle==="value")return 5;return 0;}
function scoreStay(o:GlobalStayV37,r:TripRequest):RankedStayV37|null{
 if(o.inStock===false)return null;const text=haystack(o),need=wanted(r),matched=signals.filter(x=>need.has(x.id)&&x.re.test(text)),missing=[...need].filter(id=>!signals.some(x=>x.id===id&&x.re.test(text)));
 let semantic=clamp(46+matched.length*11+styleFit(r,text)+(r.travelerType==="couple"&&/adults only|boutique|suite|private/i.test(text)?7:0)+(r.travelerType==="family"&&/family|kids|apartment|kitchen/i.test(text)?9:0)-Math.min(18,missing.length*4));
 const discount=pct(o);let value=55;if(o.price!=null&&o.price>0){const ratio=o.price/Math.max(1,r.budget);value=ratio<=.3?94:ratio<=.55?88:ratio<=.8?78:ratio<=1?68:ratio<=1.3?52:ratio<=1.8?38:25;}if(discount!=null)value=clamp(value+Math.min(12,discount*.3));if(r.avoid==="high-cost"&&value<50)value-=8;
 const location=o.distanceKm==null?52:o.distanceKm<=2?96:o.distanceKm<=7?88:o.distanceKm<=15?76:o.distanceKm<=30?62:o.distanceKm<=50?48:35;
 const evidence=clamp((o.imageUrl||o.thumbUrl?18:5)+(o.description?20:8)+(o.address||o.city?16:6)+(o.distanceKm!=null?16:5)+(o.trackingUrl?18:0)+(o.validFrom&&o.validTo?12:5));
 const dateScore=o.dateFit==="exact"?100:o.dateFit==="overlap"?70:42,geoScore=o.matchTier==="core"?100:58;
 const score=Math.round(clamp(semantic*.31+value*.18+location*.15+evidence*.14+dateScore*.14+geoScore*.08));const reasons:string[]=[];
 if(matched.length)reasons.push(say(r,`Ταιριάζει στα κριτήριά σου: ${matched.slice(0,4).map(x=>x.el).join(", ")}.`,`Matches your criteria: ${matched.slice(0,4).map(x=>x.en).join(", ")}.`));
 if(o.dateFit==="exact")reasons.push(say(r,"Το feed καλύπτει ολόκληρο το επιλεγμένο date window.","The feed validity covers the full selected date window."));
 else if(o.dateFit==="overlap")reasons.push(say(r,"Το feed επικαλύπτει μέρος του date window — χρειάζεται επιβεβαίωση πριν κλειδώσεις ημερομηνίες.","The feed overlaps part of the date window — confirm dates before committing."));
 else reasons.push(say(r,"Το κατάλυμα υπάρχει στο ενεργό joined inventory, αλλά οι συγκεκριμένες ημερομηνίες χρειάζονται επιβεβαίωση στον πάροχο.","The stay exists in active joined inventory, but these exact dates need provider confirmation."));
 if(o.distanceKm!=null)reasons.push(say(r,`Περίπου ${o.distanceKm.toFixed(1)} km από τον canonical προορισμό.`,`About ${o.distanceKm.toFixed(1)} km from the canonical destination.`));
 if(o.price!=null)reasons.push(say(r,`Feed price signal: ${o.currency??"EUR"} ${Math.round(o.price)} — όχι εγγυημένη τελική τιμή κράτησης.`,`Feed price signal: ${o.currency??"EUR"} ${Math.round(o.price)} — not a guaranteed final booking price.`));
 let tradeoff=say(r,"Τελική τιμή, τύπος δωματίου και live availability επιβεβαιώνονται πάντα στον πάροχο.","Final price, room type and live availability are always confirmed with the provider.");
 if(o.matchTier==="nearby")tradeoff=say(r,"Είναι nearby επιλογή και όχι στον στενό πυρήνα του προορισμού — έλεγξε τη μετακίνηση.","This is a nearby option rather than in the destination core — check transport.");
 if(o.dateFit!=="exact")tradeoff=say(r,"Δεν παρουσιάζω τις ημερομηνίες ως επιβεβαιωμένη διαθεσιμότητα· ο πάροχος πρέπει να τις επιβεβαιώσει.","I do not present these dates as confirmed availability; the provider must confirm them.");
 return{sourceProductId:o.sourceProductId,propertyName:o.propertyName,trackingUrl:o.trackingUrl,imageUrl:o.imageUrl??o.thumbUrl??null,price:o.price??null,fullPrice:o.fullPrice??null,currency:o.currency??null,discountPct:discount,availability:o.availability??null,inStock:o.inStock??null,city:o.city??null,address:o.address??null,distanceKm:o.distanceKm??null,score,semanticScore:Math.round(semantic),valueScore:Math.round(value),locationScore:Math.round(location),evidenceScore:Math.round(evidence),dateScore,reasons:reasons.slice(0,5),matchedSignals:matched.map(x=>r.language==="en"?x.en:x.el).slice(0,6),tradeoff,dateFit:o.dateFit,matchTier:o.matchTier};
}

export function structuredIntentV37(r:TripRequest):V8IntentProfile{const weights=Object.fromEntries(V8_DIMENSIONS.map(d=>[d,.05])) as Record<(typeof V8_DIMENSIONS)[number],number>;for(const m of r.moods)weights[m==="warmth"?"warmth":m]=1;if(r.mustHave!=="none")weights[r.mustHave==="sea"?"beach":r.mustHave]=1;if(r.travelerType==="family")weights.family=.9;if(r.desiredEnergy==="restore"){weights.relax=Math.max(weights.relax,.95);weights.wellness=.7;}if(r.hotelStyle==="luxury")weights.luxury=.8;if(r.hotelStyle==="value")weights.value=.9;return{weights,source:"structured",summary:say(r,"Structured fallback intent από τα δηλωμένα κριτήρια.","Structured fallback intent from the declared criteria.")};}
async function resolveIntent(r:TripRequest,base:V8RecommendationResponse|null){if(base?.intent)return base.intent;try{return await interpretIntentV8(r,createLLMRequestBudgetV16());}catch{return structuredIntentV37(r);}}
function fallbackRec(d:V8Destination,rank:number):V8Recommendation{return{slug:d.slug,destination:d.nameEl,destinationEn:d.nameEn,country:d.countryEl,countryCode:d.countryCode,regionGroup:d.regionGroup,role:rank===0?"INVENTORY_RECOVERY":"ALTERNATIVE",explorationRole:rank===0?"BEST_FIT":"ALTERNATIVE",explorationReason:"Real stay-backed recovery candidate",score:55,fitStatus:"compromise",confidence:"MEDIUM",why:"Real stay inventory exists; semantic fit is a recovery estimate.",seasonNote:"Season fit requires final verification.",effortLabel:d.effortAthens,budgetLabel:`tier ${d.costTier}`,tags:d.tags,latitude:d.latitude,longitude:d.longitude,directFromAthens:d.directFromAthens,routeConfidence:d.routeConfidence,breakdown:{intent:55,season:55,effort:55,duration:55,budget:55,weather:55,traveler:55,crowdFit:55,routeConfidence:Math.round(d.routeConfidence*100)}};}
function mergeOffers(base:GlobalStayV37[],more:GlobalStayV37[]){const m=new Map(base.map(x=>[x.sourceProductId,x]));for(const x of more){const old=m.get(x.sourceProductId);if(!old||old.dateFit!=="exact"&&x.dateFit==="exact"||old.matchTier==="nearby"&&x.matchTier==="core")m.set(x.sourceProductId,x);}return[...m.values()];}
function distinctDestinations(rows:GlobalStayV37[]){return new Set(rows.map(x=>x.destinationSlug)).size;}

export async function buildEscapeSolutionsV37(request:TripRequest,base:V8RecommendationResponse|null,maxSolutions=10):Promise<EscapeSolutionResponseV37>{
 const[intent,catalog]=await Promise.all([resolveIntent(request,base),loadV8DestinationCatalog()]);const passes:string[]=[];let relaxations:string[]=[];
 let offers=await loadGlobalStaysV37(request.startDate,request.endDate,"exact",false,120);passes.push(`exact-core:${offers.length}`);let mode:EscapeSolutionResponseV37["sourceMode"]="global-exact";
 if(distinctDestinations(offers)<Math.min(maxSolutions,10)){const more=await loadGlobalStaysV37(request.startDate,request.endDate,"exact",true,120);offers=mergeOffers(offers,more);passes.push(`exact-nearby:${more.length}`);mode="global-location-recovery";relaxations.push("location_radius");}
 if(distinctDestinations(offers)<Math.min(maxSolutions,10)&&request.dateFlexibility!=="fixed"){const more=await loadGlobalStaysV37(request.startDate,request.endDate,"overlap",true,120);offers=mergeOffers(offers,more);passes.push(`date-overlap:${more.length}`);mode="global-constraint-recovery";relaxations.push("date_overlap");}
 if(distinctDestinations(offers)<Math.min(maxSolutions,6)){const more=await loadGlobalStaysV37(request.startDate,request.endDate,"listed",true,120);offers=mergeOffers(offers,more);passes.push(`provider-check:${more.length}`);mode="global-provider-check";relaxations.push("provider_date_check");}
 if(!offers.length)throw new Error("REAL_STAY_INVENTORY_EMPTY");
 const strictRank=preRankV8(request,intent,catalog,catalog.length),strictRecs=toRecommendationsV8(request,strictRank,catalog.length),strictMap=new Map(strictRecs.map((x,i)=>[x.slug,{rec:x,rank:i+1}]));
 const relaxedRequest:TripRequest={...request,mustHave:"none",avoid:"none",distancePreference:"any"};const relaxedRank=preRankV8(relaxedRequest,intent,catalog,catalog.length),relaxedRecs=toRecommendationsV8(relaxedRequest,relaxedRank,catalog.length),relaxedMap=new Map(relaxedRecs.map((x,i)=>[x.slug,{rec:{...x,fitStatus:"compromise" as const},rank:i+1}]));
 const catalogMap=new Map(catalog.map(x=>[x.slug,x]));const groups=new Map<string,GlobalStayV37[]>();for(const o of offers){if(!groups.has(o.destinationSlug))groups.set(o.destinationSlug,[]);groups.get(o.destinationSlug)!.push(o);}const provisional:Array<Omit<EscapeSolutionV37,"rank"|"reasoning">&{relaxed:boolean}>=[];
 for(const[slug,raw]of groups){const strict=strictMap.get(slug),soft=strict??relaxedMap.get(slug),dest=catalogMap.get(slug);if(!soft&&!dest)continue;const rec=soft?.rec??fallbackRec(dest!,999),forwardRank=soft?.rank??999,relaxed=!strict;const ranked=raw.map(o=>scoreStay(o,request)).filter((x):x is RankedStayV37=>Boolean(x)).sort((a,b)=>b.score-a.score||(a.price??Number.MAX_SAFE_INTEGER)-(b.price??Number.MAX_SAFE_INTEGER));if(!ranked.length)continue;const best=ranked[0],inventoryCount=ranked.length,inventoryDepth=Math.round(clamp(Math.min(inventoryCount,15)/15*100)),stayScore=Math.round(clamp(best.score*.8+inventoryDepth*.2)),destinationScore=Math.round(rec.score),combinedScore=Math.round(clamp(destinationScore*.52+stayScore*.48-(relaxed?5:0)));provisional.push({forwardRank,combinedScore,destinationScore,stayScore,inventoryDepth,inventoryCount,recommendation:rec,stay:best,alternatives:ranked.slice(1,8),relaxed});}
 provisional.sort((a,b)=>b.combinedScore-a.combinedScore||b.stayScore-a.stayScore||b.inventoryCount-a.inventoryCount);const picked=provisional.slice(0,Math.max(1,Math.min(10,maxSolutions)));if(picked.some(x=>x.relaxed)){mode=mode==="global-exact"?"global-constraint-recovery":mode;relaxations.push("soft_destination_constraints");}
 const solutions:EscapeSolutionV37[]=picked.map((x,index)=>{const delta=x.forwardRank-(index+1),reverse=delta>0?say(request,`Το πραγματικό stay inventory ανέβασε αυτή την επιλογή κατά ${delta} θέση/εις.`,`Real stay inventory moved this option up ${delta} place(s).`):delta<0?say(request,`Το destination fit ήταν ισχυρότερο από το stay fit· το inventory την κατέβασε ${Math.abs(delta)} θέση/εις.`,`Destination fit was stronger than stay fit; inventory moved it down ${Math.abs(delta)} place(s).`):say(request,"Destination fit και stay fit συμφωνούν.","Destination fit and stay fit agree.");return{rank:index+1,...x,reasoning:{destination:x.recommendation.why||say(request,"Ταιριάζει στο συνολικό travel profile.","It fits the overall travel profile."),stay:x.stay.reasons[0]??say(request,"Το κατάλυμα είναι πραγματικό stay-backed candidate.","The stay is a real inventory-backed candidate."),reverse,tradeoff:x.stay.tradeoff}};});
 const uniqueOffers=new Set(offers.map(x=>x.sourceProductId));return{version:37,generatedAt:new Date().toISOString(),request,profileSummary:base?.profileSummary??intent.summary,candidateCount:catalog.length,inventoryChecked:offers.length,inventoryOfferCount:uniqueOffers.size,solutionCount:solutions.length,sourceMode:mode,relaxationsApplied:[...new Set(relaxations)],diagnostics:{passes,distinctDestinations:distinctDestinations(offers),exactOffers:offers.filter(x=>x.dateFit==="exact").length,coreOffers:offers.filter(x=>x.matchTier==="core").length,providerCheckOffers:offers.filter(x=>x.dateFit==="provider_check").length},solutions};
}
