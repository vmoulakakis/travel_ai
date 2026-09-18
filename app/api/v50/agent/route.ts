import { NextResponse } from "next/server";
import { runTravelOrchestratorV45 } from "@/lib/ai/travel-orchestrator-v45";
import {
  TRAVEL_PROFILE_COOKIE,
  TRAVEL_PROFILE_HEADER,
  travelerProfileKeyFromRequest
} from "@/lib/ai/travel-intelligence-v45";
import {
  buildV50Trip,
  interpretV50Conversation,
  nextV50Question,
  type V50ConversationInput
} from "@/lib/ai/v50-agent-state";
import { loadV8DestinationCatalog,loadV8StayOffers } from "@/lib/data/destination-v8";
import { assessStayAvailabilityV20 } from "@/lib/decision/stay-availability-v20";
import type { V8Recommendation,V8StayOffer } from "@/lib/decision/v8-types";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;

type Input=V50ConversationInput & {
  currentTopIds?:string[];
  selectedStay?:{
    productId:string;
    name:string;
    location:string;
    price?:number|null;
  }|null;
};

const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));
const moneyFit=(price:number|null,budget:number)=>{
  if(!price||price<=0)return 52;
  const ratio=price/Math.max(1,budget);
  return ratio<=.25?94:ratio<=.5?88:ratio<=.8?78:ratio<=1?68:ratio<=1.25?54:36;
};
const truthScore=(offer:V8StayOffer,start:string,end:string)=>{
  const a=assessStayAvailabilityV20(offer,start,end);
  if(a.truth==="CONFIRMED_ACTIVE")return 100;
  if(a.truth==="VALID_WINDOW_STOCK_UNKNOWN")return 74;
  return 0;
};

function offerScore(offer:V8StayOffer,budget:number,start:string,end:string){
  const truth=truthScore(offer,start,end);
  if(!truth)return -1;
  const distance=offer.distanceKm==null?52:offer.distanceKm<=3?96:offer.distanceKm<=10?84:offer.distanceKm<=25?66:44;
  const price=moneyFit(offer.price??null,budget);
  return truth*.52+distance*.18+price*.30;
}

async function bestStay(recommendation:V8Recommendation,budget:number,start:string,end:string){
  const offers=await loadV8StayOffers(recommendation.slug,start,end,60).catch(()=>[]);
  const ranked=offers
    .map(offer=>({offer,score:offerScore(offer,budget,start,end),availability:assessStayAvailabilityV20(offer,start,end)}))
    .filter(x=>x.score>=0)
    .sort((a,b)=>b.score-a.score);
  return{best:ranked[0]??null,offerCount:ranked.length};
}

function responseWithProfile(payload:Record<string,unknown>,profileKey:string,status=200){
  const response=NextResponse.json(payload,{status,headers:{
    "cache-control":"no-store",
    "x-travel-engine":"v50-agentic-home"
  }});
  response.cookies.set(TRAVEL_PROFILE_COOKIE,profileKey,{
    httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:15552000
  });
  response.headers.set(TRAVEL_PROFILE_HEADER,profileKey);
  return response;
}

export async function POST(request:Request){
  const body=await request.json().catch(()=>null) as Input|null;
  if(!body||typeof body.userText!=="string"||body.userText.trim().length<1){
    return NextResponse.json({ok:false,error:"missing_user_text"},{status:400});
  }

  const profileKey=travelerProfileKeyFromRequest(request)??crypto.randomUUID();
  const input:V50ConversationInput={
    userText:body.userText.slice(0,500),
    priorUserText:typeof body.priorUserText==="string"?body.priorUserText.slice(-1000):"",
    origin:body.origin,
    budget:body.budget,
    filters:body.filters,
    answers:body.answers
  };
  const interpreted=interpretV50Conversation(input);

  if(body.selectedStay&&Array.isArray(body.currentTopIds)&&!body.currentTopIds.includes(body.selectedStay.productId)){
    return responseWithProfile({
      ok:true,state:"challenge",
      agentMessage:`Το «${body.selectedStay.name}» δεν είναι μέσα στις τωρινές ισχυρότερες λύσεις για το brief σου. Δεν σημαίνει ότι είναι κακό κατάλυμα· σημαίνει ότι δεν θα στο προωθήσω χωρίς νέα σύγκριση. Αν θέλεις, το χρησιμοποιώ ως reference και ψάχνω παρόμοια εμπειρία με καλύτερο συνολικό fit.`,
      selectedStay:body.selectedStay,
      interpreted
    },profileKey);
  }

  const question=nextV50Question(interpreted,input.answers);
  if(question){
    return responseWithProfile({
      ok:true,state:"clarify",
      agentMessage:question.text,
      question,
      interpreted:{
        confidence:interpreted.confidence,
        signals:interpreted.signals,
        startDate:interpreted.startDate,
        endDate:interpreted.endDate,
        travelerType:interpreted.travelerType,
        mustHave:interpreted.mustHave
      }
    },profileKey);
  }

  try{
    const trip=buildV50Trip(input,interpreted),sessionId=crypto.randomUUID();
    const recommendation=await runTravelOrchestratorV45(trip,sessionId,profileKey);
    const candidates=recommendation.recommendations.slice(0,12);
    const stayRows=await Promise.all(candidates.map(async rec=>({rec,...await bestStay(rec,trip.budget,trip.startDate,trip.endDate)})));
    const solutions=stayRows
      .filter((row):row is typeof row & {best:NonNullable<typeof row.best>}=>Boolean(row.best))
      .slice(0,5)
      .map((row,index)=>{
        const {offer,availability}=row.best;
        const destination=row.rec;
        const fit=clamp(Math.round(destination.score));
        return{
          rank:index+1,
          score:fit,
          destination:{
            slug:destination.slug,
            name:destination.destination,
            regionGroup:destination.regionGroup,
            latitude:destination.latitude,
            longitude:destination.longitude,
            explorationRole:destination.explorationRole,
            explorationReason:destination.explorationReason,
            why:destination.why,
            seasonNote:destination.seasonNote,
            effortLabel:destination.effortLabel,
            budgetLabel:destination.budgetLabel,
            tags:destination.tags,
            weather:destination.weather??null
          },
          stay:{
            productId:offer.sourceProductId,
            name:offer.propertyName,
            description:offer.description,
            price:offer.price,
            fullPrice:offer.fullPrice,
            discount:offer.discount,
            currency:offer.currency??"EUR",
            latitude:offer.latitude??destination.latitude,
            longitude:offer.longitude??destination.longitude,
            imageUrl:offer.imageUrl??offer.thumbUrl,
            trackingUrl:offer.trackingUrl,
            availability:availability.truth,
            availabilityConfidence:availability.confidence,
            distanceKm:offer.distanceKm
          },
          liveOfferCount:row.offerCount
        };
      });

    const solutionCount=solutions.length;
    const agentMessage=solutionCount>=5
      ? `Τώρα το έχω αρκετά καθαρά. Έλεγξα το brief σου, τις ημερομηνίες, τη μόνιμη travel μνήμη και πραγματικές stay offers. Σου κρατάω τις 5 πιο δυνατές λύσεις — όχι απλώς τους πιο δημοφιλείς προορισμούς.`
      : `Κατάλαβα το brief σου, αλλά μόνο ${solutionCount} λύσεις πέρασαν και το live stay check για αυτές τις ημερομηνίες. Προτιμώ να σου δείξω λιγότερες πραγματικές επιλογές παρά να γεμίσω τη λίστα με άσχετες.`;

    return responseWithProfile({
      ok:true,state:"results",agentMessage,
      interpreted:{
        confidence:interpreted.confidence,
        signals:interpreted.signals,
        summary:recommendation.intent.summary,
        profileSummary:recommendation.profileSummary,
        startDate:trip.startDate,endDate:trip.endDate,nights:trip.nights,
        mustHave:interpreted.mustHave,terrainIntent:interpreted.terrainIntent,travelerType:interpreted.travelerType
      },
      trip,
      inventory:{
        catalogSize:recommendation.catalogSize,
        eligibleCount:recommendation.eligibleCount??0,
        resultCount:recommendation.resultCount,
        stayVerifiedSolutions:solutionCount
      },
      feasibility:recommendation.feasibility,
      solutions
    },profileKey);
  }catch(error){
    const message=error instanceof Error?error.message:"v50_agent_failed";
    return responseWithProfile({
      ok:false,state:"error",
      agentMessage:"Δεν θα μαντέψω. Κάτι απέτυχε στον έλεγχο δεδομένων και κράτησα το brief σου για να συνεχίσουμε χωρίς να χαθεί.",
      error:process.env.NODE_ENV==="development"?message:"agent_evidence_check_failed"
    },profileKey,503);
  }
}
