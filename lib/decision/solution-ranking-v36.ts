import { interpretIntentV8 } from "@/lib/ai/intent-v8";
import { createLLMRequestBudgetV16 } from "@/lib/ai/model-router-v9";
import { loadV8DestinationCatalog, loadV8StayOffers } from "@/lib/data/destination-v8";
import { preRankV8, toRecommendationsV8 } from "@/lib/decision/v8-matcher";
import type { V8IntentProfile, V8Recommendation, V8RecommendationResponse, V8StayOffer } from "@/lib/decision/v8-types";
import type { TripRequest } from "@/lib/validation/trip";

export interface RankedStayV36 {
  sourceProductId:string;
  propertyName:string;
  trackingUrl:string;
  imageUrl:string|null;
  price:number|null;
  fullPrice:number|null;
  currency:string|null;
  discountPct:number|null;
  availability:string|null;
  inStock:boolean|null;
  city:string|null;
  address:string|null;
  distanceKm:number|null;
  score:number;
  semanticScore:number;
  valueScore:number;
  locationScore:number;
  evidenceScore:number;
  reasons:string[];
  matchedSignals:string[];
  tradeoff:string;
}

export interface EscapeSolutionV36 {
  rank:number;
  forwardRank:number;
  combinedScore:number;
  destinationScore:number;
  stayScore:number;
  inventoryDepth:number;
  inventoryCount:number;
  recommendation:V8Recommendation;
  stay:RankedStayV36;
  alternatives:RankedStayV36[];
  reasoning:{
    destination:string;
    stay:string;
    reverse:string;
    tradeoff:string;
  };
}

export interface EscapeSolutionResponseV36 {
  version:36;
  generatedAt:string;
  request:TripRequest;
  profileSummary:string;
  candidateCount:number;
  inventoryChecked:number;
  inventoryOfferCount:number;
  solutionCount:number;
  sourceMode:"forward+reverse"|"reverse-recovery";
  solutions:EscapeSolutionV36[];
}

const clamp=(v:number,min=0,max=100)=>Math.max(min,Math.min(max,v));
const say=(request:TripRequest,el:string,en:string)=>request.language==="en"?en:el;
const parseDate=(value:string|null|undefined)=>value?Date.parse(`${value.slice(0,10)}T00:00:00Z`):NaN;

function discountPct(offer:V8StayOffer):number|null{
  if(offer.fullPrice!=null&&offer.price!=null&&offer.fullPrice>offer.price&&offer.fullPrice>0)return clamp(((offer.fullPrice-offer.price)/offer.fullPrice)*100,0,90);
  if(offer.discount!=null&&Number.isFinite(offer.discount)){const n=Number(offer.discount);return n>0&&n<=100?n:null;}
  return null;
}

function validForWindow(offer:V8StayOffer,request:TripRequest){
  const start=Date.parse(`${request.startDate}T00:00:00Z`),end=Date.parse(`${request.endDate}T00:00:00Z`),from=parseDate(offer.validFrom),to=parseDate(offer.validTo);
  if(Number.isFinite(from)&&from>start)return false;
  if(Number.isFinite(to)&&to<end)return false;
  return true;
}

function haystack(offer:V8StayOffer){
  const raw=offer.raw&&typeof offer.raw==="object"?JSON.stringify(offer.raw):"";
  return `${offer.propertyName} ${offer.description??""} ${offer.category??""} ${raw}`.toLowerCase();
}

const signalPatterns:{id:string;pattern:RegExp;el:string;en:string}[]=[
  {id:"sea",pattern:/beach|beachfront|seaside|sea view|coast|παραλ|θάλασσ|θαλασσ/,el:"θάλασσα / παραλία",en:"sea / beach"},
  {id:"nature",pattern:/garden|forest|mountain|nature|eco|rural|vineyard|κήπ|βουν|φύσ|φυση/,el:"φύση",en:"nature"},
  {id:"wellness",pattern:/spa|wellness|massage|thermal|sauna|hamam|hammam|ευεξ/,el:"wellness / spa",en:"wellness / spa"},
  {id:"romantic",pattern:/boutique|suite|adults only|romantic|honeymoon|private|μπουτίκ|σουίτα/,el:"boutique / romantic χαρακτήρα",en:"boutique / romantic character"},
  {id:"family",pattern:/family|kids|children|apartment|kitchen|family room|παιδ|οικογεν|διαμέρισμα|διαμερισμα/,el:"family-friendly στοιχεία",en:"family-friendly cues"},
  {id:"city",pattern:/old town|historic|centre|center|downtown|city centre|κέντρο|κεντρο|παλιά πόλη|παλια πολη/,el:"κεντρική / city βάση",en:"central / city base"},
  {id:"pool",pattern:/pool|swimming|πισίνα|πισινα/,el:"πισίνα",en:"pool"},
  {id:"luxury",pattern:/luxury|5 star|5\*|resort|premium|deluxe|πολυτελ/,el:"premium χαρακτήρα",en:"premium character"}
];

function desiredSignals(request:TripRequest){
  const wanted=new Set<string>();
  for(const mood of request.moods){
    if(mood==="romantic")wanted.add("romantic");
    if(mood==="nature")wanted.add("nature");
    if(mood==="city"||mood==="culture"||mood==="food")wanted.add("city");
    if(mood==="relax")wanted.add("wellness");
    if(mood==="warmth")wanted.add("sea");
  }
  if(request.mustHave==="sea")wanted.add("sea");
  if(request.mustHave==="nature")wanted.add("nature");
  if(request.mustHave==="culture"||request.mustHave==="nightlife")wanted.add("city");
  if(request.travelerType==="family")wanted.add("family");
  return wanted;
}

function scoreStay(offer:V8StayOffer,request:TripRequest):RankedStayV36|null{
  if(offer.inStock===false||!validForWindow(offer,request))return null;
  const text=haystack(offer),wanted=desiredSignals(request),matched=signalPatterns.filter(item=>wanted.has(item.id)&&item.pattern.test(text));
  const semanticScore=clamp(42+matched.length*14+(request.travelerType==="couple"&&/adults only|boutique|suite|private/.test(text)?8:0)+(request.travelerType==="family"&&/family|kids|apartment|kitchen/.test(text)?10:0));
  const pct=discountPct(offer);
  let valueScore=50;
  if(offer.price!=null&&offer.price>0){const ratio=offer.price/Math.max(1,request.budget);valueScore=ratio<=.45?90:ratio<=.7?82:ratio<=.95?72:ratio<=1.15?58:ratio<=1.4?42:28;}
  if(pct!=null)valueScore=clamp(valueScore+Math.min(12,pct*.35));
  const locationScore=offer.distanceKm==null?55:offer.distanceKm<=2?94:offer.distanceKm<=6?84:offer.distanceKm<=15?68:offer.distanceKm<=30?48:30;
  const evidenceScore=clamp((offer.inStock===true?30:16)+(offer.availability?14:6)+(offer.imageUrl||offer.thumbUrl?12:4)+(offer.description?18:7)+(offer.address||offer.city?12:5)+(offer.distanceKm!=null?14:5));
  const score=Math.round(clamp(semanticScore*.34+valueScore*.24+locationScore*.20+evidenceScore*.22));
  const reasons:string[]=[];
  if(matched.length)reasons.push(say(request,`Το feed αναφέρει στοιχεία που ταιριάζουν σε: ${matched.slice(0,3).map(x=>x.el).join(", ")}.`,`The feed mentions cues matching: ${matched.slice(0,3).map(x=>x.en).join(", ")}.`));
  if(offer.distanceKm!=null&&offer.distanceKm<=10)reasons.push(say(request,`Βρίσκεται περίπου ${offer.distanceKm.toFixed(1)} km από τον πυρήνα του προορισμού.`,`It is about ${offer.distanceKm.toFixed(1)} km from the destination core.`));
  if(offer.inStock===true)reasons.push(say(request,"Το feed το δηλώνει ενεργό για αναζήτηση.","The feed marks it active for search."));
  if(offer.price!=null)reasons.push(say(request,`Η τιμή feed είναι ${offer.currency??"EUR"} ${Math.round(offer.price)} και χρησιμοποιείται μόνο ως σήμα αξίας, όχι ως τελική τιμή κράτησης.`,`The feed price is ${offer.currency??"EUR"} ${Math.round(offer.price)} and is used only as a value signal, not a final booking price.`));
  if(pct!=null&&pct>=10)reasons.push(say(request,`Το feed δείχνει περίπου ${Math.round(pct)}% διαφορά από την πλήρη τιμή.`,`The feed shows about ${Math.round(pct)}% difference from full price.`));
  let tradeoff=say(request,"Η τελική τιμή, ο τύπος δωματίου και η πραγματική διαθεσιμότητα επιβεβαιώνονται πάντα στον πάροχο.","Final price, room type and live availability must always be confirmed with the provider.");
  if(!matched.length)tradeoff=say(request,"Το inventory είναι λειτουργικό, αλλά το feed δεν τεκμηριώνει αρκετά mood-specific χαρακτηριστικά· γι’ αυτό δεν παίρνει υψηλό semantic score.","The inventory is usable, but the feed does not document enough mood-specific features, so it does not receive a high semantic score.");
  if(offer.distanceKm!=null&&offer.distanceKm>20)tradeoff=say(request,"Το κατάλυμα είναι αρκετά έξω από τον πυρήνα του προορισμού· η μετακίνηση είναι πραγματικό trade-off.","The stay is well outside the destination core; transport is a real trade-off.");
  return{sourceProductId:offer.sourceProductId,propertyName:offer.propertyName,trackingUrl:offer.trackingUrl,imageUrl:offer.imageUrl??offer.thumbUrl??null,price:offer.price??null,fullPrice:offer.fullPrice??null,currency:offer.currency??null,discountPct:pct,availability:offer.availability??null,inStock:offer.inStock??null,city:offer.city??null,address:offer.address??null,distanceKm:offer.distanceKm??null,score,semanticScore:Math.round(semanticScore),valueScore:Math.round(valueScore),locationScore:Math.round(locationScore),evidenceScore:Math.round(evidenceScore),reasons:reasons.slice(0,4),matchedSignals:matched.map(item=>request.language==="en"?item.en:item.el).slice(0,5),tradeoff};
}

async function resolveIntent(request:TripRequest,base:V8RecommendationResponse|null):Promise<V8IntentProfile>{
  if(base?.intent)return base.intent;
  return interpretIntentV8(request,createLLMRequestBudgetV16());
}

function candidatePool(base:V8RecommendationResponse|null,global:V8Recommendation[]){
  const map=new Map<string,V8Recommendation>();
  for(const rec of base?.recommendations??[])map.set(rec.slug,rec);
  for(const rec of global)if(!map.has(rec.slug))map.set(rec.slug,rec);
  return[...map.values()].slice(0,28);
}

async function inventoryFor(rec:V8Recommendation,request:TripRequest){
  try{
    const offers=await loadV8StayOffers(rec.slug,request.startDate,request.endDate,40);
    const ranked=offers.map(x=>scoreStay(x,request)).filter((x):x is RankedStayV36=>Boolean(x)).sort((a,b)=>b.score-a.score||(a.price??Number.MAX_SAFE_INTEGER)-(b.price??Number.MAX_SAFE_INTEGER));
    return{rec,ranked};
  }catch{return{rec,ranked:[] as RankedStayV36[]};}
}

async function scanWave(candidates:V8Recommendation[],request:TripRequest,from:number,to:number){
  const selected=candidates.slice(from,to),rows:Array<{rec:V8Recommendation;ranked:RankedStayV36[]}>=[];
  for(let offset=0;offset<selected.length;offset+=4)rows.push(...await Promise.all(selected.slice(offset,offset+4).map(rec=>inventoryFor(rec,request))));
  return rows;
}

export async function buildEscapeSolutionsV36(request:TripRequest,base:V8RecommendationResponse|null,maxSolutions=10):Promise<EscapeSolutionResponseV36>{
  const[intent,catalog]=await Promise.all([resolveIntent(request,base),loadV8DestinationCatalog()]);
  const globalRanked=preRankV8(request,intent,catalog,Math.min(28,Math.max(20,catalog.length)));
  const globalRecommendations=toRecommendationsV8(request,globalRanked).slice(0,24);
  const candidates=candidatePool(base,globalRecommendations);
  const first=await scanWave(candidates,request,0,16);
  let rows=[...first];
  let viable=rows.filter(row=>row.ranked.length>0).length;
  if(viable<Math.min(10,maxSolutions)&&candidates.length>16){const second=await scanWave(candidates,request,16,28);rows.push(...second);viable=rows.filter(row=>row.ranked.length>0).length;}

  const forwardRank=new Map(candidates.map((rec,index)=>[rec.slug,index+1]));
  const provisional=rows.flatMap(row=>{
    const best=row.ranked[0];if(!best)return[];
    const inventoryCount=row.ranked.length,inventoryDepth=Math.round(clamp((Math.min(inventoryCount,12)/12)*100));
    const stayScore=Math.round(clamp(best.score*.78+inventoryDepth*.22));
    const combinedScore=Math.round(clamp(row.rec.score*.58+stayScore*.42));
    return[{forwardRank:forwardRank.get(row.rec.slug)??99,combinedScore,destinationScore:Math.round(row.rec.score),stayScore,inventoryDepth,inventoryCount,recommendation:row.rec,stay:best,alternatives:row.ranked.slice(1,5)}];
  }).sort((a,b)=>b.combinedScore-a.combinedScore||b.stayScore-a.stayScore||b.destinationScore-a.destinationScore).slice(0,Math.max(1,Math.min(10,maxSolutions)));

  const solutions:EscapeSolutionV36[]=provisional.map((item,index)=>{
    const rank=index+1,delta=item.forwardRank-rank;
    const reverse=delta>0?say(request,`Η διαμονή άλλαξε την απόφαση: ο προορισμός ανέβηκε ${delta} θέση${delta===1?"":"εις"} όταν ελέγξαμε το πραγματικό inventory.`,`The stay inventory changed the decision: this destination moved up ${delta} place${delta===1?"":"s"} after checking real inventory.`):delta<0?say(request,`Ο προορισμός ήταν ισχυρός θεωρητικά, αλλά έπεσε ${Math.abs(delta)} θέση${Math.abs(delta)===1?"":"εις"} επειδή τα πραγματικά καταλύματα είναι πιο αδύναμα από άλλες λύσεις.`,`The destination was strong in theory, but moved down ${Math.abs(delta)} place${Math.abs(delta)===1?"":"s"} because its real stays are weaker than other solutions.`):say(request,"Forward fit και reverse inventory check συμφωνούν — η θέση του προορισμού επιβεβαιώθηκε.","Forward fit and the reverse inventory check agree — the destination kept its position.");
    const stay=item.stay.reasons.length?item.stay.reasons.join(" "):say(request,"Είναι η ισχυρότερη τεκμηριωμένη διαμονή που βρήκα για αυτή τη λύση.","It is the strongest documented stay found for this solution.");
    return{...item,rank,reasoning:{destination:item.recommendation.why,stay,reverse,tradeoff:item.stay.tradeoff}};
  });

  return{version:36,generatedAt:new Date().toISOString(),request,profileSummary:base?.profileSummary??intent.summary,candidateCount:candidates.length,inventoryChecked:rows.length,inventoryOfferCount:rows.reduce((sum,row)=>sum+row.ranked.length,0),solutionCount:solutions.length,sourceMode:base?"forward+reverse":"reverse-recovery",solutions};
}
