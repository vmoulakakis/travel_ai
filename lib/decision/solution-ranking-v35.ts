import { loadV8StayOffers } from "@/lib/data/destination-v8";
import type { V8Recommendation, V8RecommendationResponse, V8StayOffer } from "@/lib/decision/v8-types";
import type { TripRequest } from "@/lib/validation/trip";

export interface RankedStayV35 {
  sourceProductId: string;
  propertyName: string;
  trackingUrl: string;
  imageUrl: string | null;
  price: number | null;
  fullPrice: number | null;
  currency: string | null;
  discountPct: number | null;
  availability: string | null;
  inStock: boolean | null;
  city: string | null;
  address: string | null;
  distanceKm: number | null;
  score: number;
  reasons: string[];
  tradeoff: string;
}

export interface EscapeSolutionV35 {
  rank: number;
  originalRank: number;
  combinedScore: number;
  destinationScore: number;
  inventoryScore: number;
  inventoryDepth: number;
  recommendation: V8Recommendation;
  stay: RankedStayV35;
  alternatives: RankedStayV35[];
  reasoning: {
    destination: string;
    stay: string;
    reverse: string;
    tradeoff: string;
  };
}

export interface EscapeSolutionResponseV35 {
  version: 35;
  generatedAt: string;
  request: TripRequest;
  profileSummary: string;
  candidateCount: number;
  inventoryChecked: number;
  solutionCount: number;
  solutions: EscapeSolutionV35[];
}

const clamp=(value:number,min=0,max=100)=>Math.max(min,Math.min(max,value));
const lang=(request:TripRequest)=>request.language==="en"?"en":"el";
const say=(request:TripRequest,el:string,en:string)=>lang(request)==="en"?en:el;
const parseDate=(value:string|null|undefined)=>value?Date.parse(`${value.slice(0,10)}T00:00:00Z`):NaN;

function discountPct(offer:V8StayOffer):number|null{
  if(offer.fullPrice!=null&&offer.price!=null&&offer.fullPrice>offer.price&&offer.fullPrice>0){
    return clamp(((offer.fullPrice-offer.price)/offer.fullPrice)*100,0,90);
  }
  if(offer.discount!=null&&Number.isFinite(offer.discount)){
    const raw=Number(offer.discount);
    return raw>0&&raw<=100?raw:null;
  }
  return null;
}

function validForWindow(offer:V8StayOffer,request:TripRequest){
  const start=Date.parse(`${request.startDate}T00:00:00Z`),end=Date.parse(`${request.endDate}T00:00:00Z`);
  const from=parseDate(offer.validFrom),to=parseDate(offer.validTo);
  if(Number.isFinite(from)&&from>start)return false;
  if(Number.isFinite(to)&&to<end)return false;
  return true;
}

function availabilitySignal(value:string|null|undefined){
  const text=(value??"").toLowerCase();
  if(/unavailable|sold out|not available|εξαντ|μη διαθέσι/.test(text))return -20;
  if(/available|in stock|διαθέσι/.test(text))return 8;
  return 3;
}

function scoreStay(offer:V8StayOffer,request:TripRequest):RankedStayV35|null{
  if(offer.inStock===false||!validForWindow(offer,request))return null;
  let score=0;
  const reasons:string[]=[];
  score+=offer.inStock===true?22:12;
  if(offer.inStock===true)reasons.push(say(request,"Δηλώνεται ενεργό στο feed","Marked active in the feed"));

  const availability=availabilitySignal(offer.availability);
  if(availability<0)return null;
  score+=availability;

  if(offer.price!=null&&offer.price>0){
    const ratio=offer.price/Math.max(1,request.budget);
    score+=ratio<=0.6?18:ratio<=0.9?15:ratio<=1.1?11:ratio<=1.35?6:2;
    reasons.push(say(request,`Τιμή feed ${offer.currency??"€"} ${Math.round(offer.price)}`,`Feed price ${offer.currency??"€"} ${Math.round(offer.price)}`));
  }else score+=7;

  const pct=discountPct(offer);
  if(pct!=null){score+=Math.min(10,pct/5);if(pct>=10)reasons.push(say(request,`Έκπτωση περίπου ${Math.round(pct)}% στο feed`,`About ${Math.round(pct)}% feed discount`));}

  if(offer.distanceKm!=null){
    score+=offer.distanceKm<=2?13:offer.distanceKm<=6?10:offer.distanceKm<=15?7:offer.distanceKm<=30?3:0;
    if(offer.distanceKm<=6)reasons.push(say(request,"Καλή εγγύτητα στον προορισμό","Good destination proximity"));
  }else score+=5;

  if(offer.demandSignal!=null&&offer.demandSignal>0)score+=Math.min(8,Math.log10(1+offer.demandSignal)*2.4);
  if(offer.imageUrl||offer.thumbUrl)score+=4;
  if(offer.propertyName)score+=3;

  let tradeoff=say(request,"Η τελική τιμή και το δωμάτιο επιβεβαιώνονται στον πάροχο.","Final price and room details must be confirmed with the provider.");
  if(offer.inStock==null)tradeoff=say(request,"Το feed δεν δίνει βέβαιη κατάσταση stock· χρειάζεται επιβεβαίωση στον πάροχο.","The feed does not provide confirmed stock; provider confirmation is required.");
  else if(offer.distanceKm!=null&&offer.distanceKm>20)tradeoff=say(request,"Είναι πιο μακριά από τον πυρήνα του προορισμού, άρα θέλει έλεγχο μετακίνησης.","It sits farther from the destination core, so transport friction needs checking.");

  return{
    sourceProductId:offer.sourceProductId,
    propertyName:offer.propertyName,
    trackingUrl:offer.trackingUrl,
    imageUrl:offer.imageUrl??offer.thumbUrl??null,
    price:offer.price??null,
    fullPrice:offer.fullPrice??null,
    currency:offer.currency??null,
    discountPct:pct,
    availability:offer.availability??null,
    inStock:offer.inStock??null,
    city:offer.city??null,
    address:offer.address??null,
    distanceKm:offer.distanceKm??null,
    score:Math.round(clamp(score)),
    reasons:reasons.slice(0,4),
    tradeoff,
  };
}

async function inventoryFor(rec:V8Recommendation,request:TripRequest){
  try{
    const offers=await loadV8StayOffers(rec.slug,request.startDate,request.endDate,36);
    const ranked=offers.map(offer=>scoreStay(offer,request)).filter((offer):offer is RankedStayV35=>Boolean(offer)).sort((a,b)=>b.score-a.score||(a.price??Number.MAX_SAFE_INTEGER)-(b.price??Number.MAX_SAFE_INTEGER));
    return{rec,ranked};
  }catch{return{rec,ranked:[] as RankedStayV35[]};}
}

export async function buildEscapeSolutionsV35(request:TripRequest,base:V8RecommendationResponse,maxSolutions=10):Promise<EscapeSolutionResponseV35>{
  const candidates=base.recommendations.slice(0,18);
  const rows:Array<{rec:V8Recommendation;ranked:RankedStayV35[]}>=[];
  for(let offset=0;offset<candidates.length;offset+=4){
    rows.push(...await Promise.all(candidates.slice(offset,offset+4).map(rec=>inventoryFor(rec,request))));
  }

  const provisional=rows.flatMap((row,index)=>{
    const best=row.ranked[0];
    if(!best)return[];
    const inventoryDepth=Math.round(clamp((Math.min(row.ranked.length,10)/10)*100));
    const inventoryScore=Math.round(clamp(best.score*0.78+inventoryDepth*0.22));
    const combinedScore=Math.round(clamp(row.rec.score*0.72+inventoryScore*0.28));
    return[{originalRank:index+1,combinedScore,destinationScore:Math.round(row.rec.score),inventoryScore,inventoryDepth,recommendation:row.rec,stay:best,alternatives:row.ranked.slice(1,4)}];
  }).sort((a,b)=>b.combinedScore-a.combinedScore||b.destinationScore-a.destinationScore).slice(0,Math.max(1,Math.min(10,maxSolutions)));

  const solutions:EscapeSolutionV35[]=provisional.map((item,index)=>{
    const rank=index+1,delta=item.originalRank-rank;
    const reverse=delta>0
      ?say(request,`Ανέβηκε ${delta} θέση${delta===1?"":"εις"} επειδή το πραγματικό inventory είναι ισχυρότερο από άλλες θεωρητικά καλές επιλογές.`,`Moved up ${delta} place${delta===1?"":"s"} because the real stay inventory is stronger than other theoretically good matches.`)
      :delta<0
       ?say(request,`Έπεσε ${Math.abs(delta)} θέση${Math.abs(delta)===1?"":"εις"}: το destination fit είναι καλό, αλλά το διαθέσιμο inventory είναι λιγότερο πειστικό.`,`Moved down ${Math.abs(delta)} place${Math.abs(delta)===1?"":"s"}: destination fit is good, but the available inventory is less convincing.`)
       :say(request,"Κράτησε τη θέση του: destination fit και πραγματικό inventory συμφωνούν.","Held its position: destination fit and real inventory agree.");
    const stayWhy=item.stay.reasons.length?item.stay.reasons.join(" · "):say(request,"Είναι η ισχυρότερη πραγματική επιλογή διαμονής που βρήκα για αυτό το ταξίδι.","It is the strongest real stay option found for this trip.");
    return{...item,rank,reasoning:{destination:item.recommendation.why,stay:stayWhy,reverse,tradeoff:item.stay.tradeoff}};
  });

  return{
    version:35,
    generatedAt:new Date().toISOString(),
    request,
    profileSummary:base.profileSummary,
    candidateCount:candidates.length,
    inventoryChecked:rows.length,
    solutionCount:solutions.length,
    solutions,
  };
}
