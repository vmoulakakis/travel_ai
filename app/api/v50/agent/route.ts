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
import { createLLMRequestBudgetV16,generateJsonWithRoutingV16 } from "@/lib/ai/model-router-v9";
import type { V8Recommendation,V8StayOffer } from "@/lib/decision/v8-types";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;

type Input=V50ConversationInput & {
  lastQuestionId?:string;
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

function greekDate(iso:string|null|undefined){
  if(!iso)return null;
  const d=new Date(iso+"T00:00:00Z");
  if(!Number.isFinite(d.getTime()))return null;
  return new Intl.DateTimeFormat("el-GR",{day:"numeric",month:"long",timeZone:"UTC"}).format(d);
}

function humanClarification(question:ReturnType<typeof nextV50Question>,interpreted:ReturnType<typeof interpretV50Conversation>,lastQuestionId?:string){
  if(!question)return"";
  const dates=interpreted.startDate&&interpreted.endDate?greekDate(interpreted.startDate)+"–"+greekDate(interpreted.endDate):null;
  if(question.id==="dates"){
    return lastQuestionId==="dates"
      ?"Δεν θέλω να σε ξαναρωτήσω μηχανικά το ίδιο. Δεν κατάλαβα με ασφάλεια την ημερομηνία. Γράψε μου όπως θα το έλεγες σε άνθρωπο, π.χ. «το πρώτο ΣΚ μετά τις 10 Οκτωβρίου» ή «15–17 Νοεμβρίου»."
      :question.text;
  }
  if(question.id==="companions"){
    return dates
      ?`Ωραία — κρατάω ${dates}. Με ποιον θα πας; Αυτό αλλάζει αρκετά το είδος διαμονής και την περιοχή που θα προτείνω.`
      :question.text;
  }
  if(question.id==="outcome"){
    return `Το βασικό πλαίσιο το έχω. Τι θέλεις να κερδίσεις περισσότερο από αυτή την απόδραση: ξεκούραση, εμπειρίες ή ισορροπία;`;
  }
  if(question.id==="friction"){
    return `Και στις μετακινήσεις; Προτιμάς κάτι κοντινό, σου αρέσει η οδήγηση ή δεν σε περιορίζει ιδιαίτερα η απόσταση;`;
  }
  return question.text;
}


async function adaptiveClarification(
  question:ReturnType<typeof nextV50Question>,
  interpreted:ReturnType<typeof interpretV50Conversation>,
  input:V50ConversationInput,
  lastQuestionId?:string
){
  const fallback=humanClarification(question,interpreted,lastQuestionId);
  if(!question)return fallback;
  const known={
    dates:interpreted.startDate&&interpreted.endDate?[interpreted.startDate,interpreted.endDate]:null,
    travelerType:interpreted.travelerType,
    energy:interpreted.desiredEnergy,
    social:interpreted.socialPreference,
    novelty:interpreted.noveltyPreference,
    mustHave:interpreted.mustHave,
    avoid:interpreted.avoid,
    distance:interpreted.distancePreference,
    signals:interpreted.signals
  };
  const system=`You are TravelAI, a sharp Greek travel concierge. The deterministic parser has already extracted known facts. Ask exactly ONE useful missing question and never repeat information the user already gave. Sound natural, specific and concise, not like a questionnaire. Reference one known fact when useful. Never recommend a destination yet and never invent prices, weather, availability, ratings or events. Do not say you are an AI model. Reply in Greek. Return JSON only: {"reply":"max 220 chars"}.`;
  const routed=await generateJsonWithRoutingV16<{reply:string}>({
    context:{task:"intent",text:[input.priorUserText,input.userText].filter(Boolean).join(" · "),deterministicConfidence:interpreted.confidence,forceSemantic:true},
    budget:createLLMRequestBudgetV16(),
    system,
    prompt:JSON.stringify({missing:question.id,known,lastQuestionId:lastQuestionId??null,currentUserText:input.userText,history:input.priorUserText??"",fallbackQuestion:question.text}),
    preference:"critical",
    validate:value=>{
      const reply=typeof value.reply==="string"?value.reply.trim().slice(0,240):"";
      return reply.length>=12?{reply}:null;
    }
  }).catch(()=>null);
  return routed?.value.reply||fallback;
}


type V42FallbackPayload={
  ok?:boolean;
  intentSummary?:string;
  solutions?:Array<{
    rank:number;score:number;
    destination:{slug:string;name:string;nameEn:string;tags:string[]};
    stay:{sourceProductId:string;propertyName:string;trackingUrl:string;imageUrl:string|null;price:number|null;currency:string|null;distanceKm:number|null;availability:string|null;semanticScore:number;vectorScore:number;travelerFit:number;valueScore:number;evidenceScore:number};
    matchedSignals:string[];reason:string;
  }>;
};

async function fallbackViaV42(request:Request,trip:ReturnType<typeof buildV50Trip>,interpreted:ReturnType<typeof interpretV50Conversation>){
  try{
    const url=new URL("/api/escape/solve-v42",request.url);
    const response=await fetch(url,{
      method:"POST",
      headers:{"content-type":"application/json","x-travel-failover":"v50"},
      body:JSON.stringify(trip),
      cache:"no-store",
      signal:AbortSignal.timeout(14000)
    });
    if(!response.ok)return null;
    const payload=await response.json() as V42FallbackPayload;
    if(!payload.ok||!Array.isArray(payload.solutions)||!payload.solutions.length)return null;
    const catalog=await loadV8DestinationCatalog().catch(()=>[]);
    const bySlug=new Map(catalog.map(item=>[item.slug,item]));
    const mountainSlugs=new Set(["zagori","meteora","pelion","ioannina","arachova","karpenisi"]);
    let rows=payload.solutions;
    if(interpreted.terrainIntent==="mountain"){
      const filtered=rows.filter(item=>{
        const profile=bySlug.get(item.destination.slug);
        return profile?.seasonProfile==="mountain"||mountainSlugs.has(item.destination.slug);
      });
      if(filtered.length)rows=filtered;
    }
    return{
      intentSummary:payload.intentSummary??null,
      solutions:rows.slice(0,10).map((item,index)=>{
        const d=bySlug.get(item.destination.slug);
        return{
          rank:index+1,
          score:item.score,
          destination:{
            slug:item.destination.slug,
            name:item.destination.name,
            regionGroup:d?.regionGroup??"",
            latitude:d?.latitude??0,
            longitude:d?.longitude??0,
            explorationRole:"verified-failover",
            explorationReason:"Full agent enrichment failed, so TravelAI returned the strongest grounded semantic + live-inventory match instead of stopping.",
            why:item.reason,
            seasonNote:"",
            effortLabel:"",
            budgetLabel:"",
            tags:item.destination.tags,
            weather:null
          },
          stay:{
            productId:item.stay.sourceProductId,
            name:item.stay.propertyName,
            description:null,
            price:item.stay.price,
            fullPrice:null,
            discount:null,
            currency:item.stay.currency??"EUR",
            latitude:d?.latitude??0,
            longitude:d?.longitude??0,
            imageUrl:item.stay.imageUrl,
            trackingUrl:item.stay.trackingUrl,
            availability:item.stay.availability??"provider-check",
            availabilityConfidence:"MEDIUM",
            distanceKm:item.stay.distanceKm
          },
          liveOfferCount:1
        };
      })
    };
  }catch{return null}
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
    const clarification=await adaptiveClarification(question,interpreted,input,body.lastQuestionId);
    return responseWithProfile({
      ok:true,state:"clarify",
      agentMessage:clarification,
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
    const [recommendation,catalog]=await Promise.all([
      runTravelOrchestratorV45(trip,sessionId,profileKey),
      loadV8DestinationCatalog()
    ]);
    const catalogBySlug=new Map(catalog.map(item=>[item.slug,item]));
    const mountainSlugs=new Set(["zagori","meteora","pelion","ioannina"]);
    const terrainFiltered=interpreted.terrainIntent==="mountain"
      ? recommendation.recommendations.filter(item=>{
          const profile=catalogBySlug.get(item.slug);
          return profile?.seasonProfile==="mountain"||mountainSlugs.has(item.slug);
        })
      : recommendation.recommendations;
    const candidates=terrainFiltered.slice(0,12);
    const stayRows=await Promise.all(candidates.map(async rec=>({rec,...await bestStay(rec,trip.budget,trip.startDate,trip.endDate)})));
    const solutions=stayRows
      .filter((row):row is typeof row & {best:NonNullable<typeof row.best>}=>Boolean(row.best))
      .slice(0,10)
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
    const topNames=solutions.slice(0,3).map(x=>x.destination.name).filter(Boolean);
    const dateText=trip.startDate&&trip.endDate?` για ${greekDate(trip.startDate)}–${greekDate(trip.endDate)}`:"";
    const agentMessage=solutionCount
      ? `Έχω ${solutionCount} πραγματικές επιλογές${dateText}. Πρώτες τώρα: ${topNames.join(" · ")}. Τις άνοιξα αμέσως από κάτω με κατάλυμα, τιμή και γιατί ταιριάζει η καθεμία.`
      : `Το brief σου είναι καθαρό, αλλά δεν βρήκα αυτή τη στιγμή επιβεβαιωμένη stay-backed επιλογή που να αξίζει να σου δείξω. Κρατάω τα κριτήριά σου και δεν θα γεμίσω τη λίστα με άσχετους προορισμούς.`;

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
        terrainEligibleCount:terrainFiltered.length,
        stayVerifiedSolutions:solutionCount
      },
      feasibility:recommendation.feasibility,
      solutions
    },profileKey);
  }catch(error){
    const message=error instanceof Error?error.message:"v50_agent_failed";
    console.error("[v50-agent] primary pipeline failed",{message,name:error instanceof Error?error.name:"unknown"});
    try{
      const trip=buildV50Trip(input,interpreted);
      const fallback=await fallbackViaV42(request,trip,interpreted);
      if(fallback?.solutions?.length){
        return responseWithProfile({
          ok:true,state:"results",
          agentMessage:"Έχω αρκετά καθαρή εικόνα για το ταξίδι σου και συνέχισα με τις διαθέσιμες επιβεβαιωμένες επιλογές. Σου δείχνω μόνο όσες μπορώ να στηρίξω με πραγματικά δεδομένα.",
          interpreted:{
            confidence:interpreted.confidence,
            signals:interpreted.signals,
            summary:fallback.intentSummary,
            startDate:trip.startDate,endDate:trip.endDate,nights:trip.nights,
            mustHave:interpreted.mustHave,terrainIntent:interpreted.terrainIntent,travelerType:interpreted.travelerType
          },
          trip,
          inventory:{catalogSize:0,eligibleCount:fallback.solutions.length,resultCount:fallback.solutions.length,stayVerifiedSolutions:fallback.solutions.length},
          feasibility:"grounded-failover",
          fallback:{engine:"v42-semantic-live-inventory",reason:message},
          solutions:fallback.solutions
        },profileKey);
      }
    }catch(fallbackError){
      console.error("[v50-agent] fallback failed",{message:fallbackError instanceof Error?fallbackError.message:String(fallbackError)});
    }
    return responseWithProfile({
      ok:true,state:"degraded",
      agentMessage:"Το brief σου είναι έτοιμο: ξέρω με ποιον ταξιδεύεις, τι θέλεις να νιώσεις και πόση μετακίνηση δέχεσαι. Δεν θα σε ξαναβάλω σε ερωτηματολόγιο· συνέχισε με την επόμενη λεπτομέρεια που σε νοιάζει ή ζήτησέ μου να σου ανοίξω τις καλύτερες επιλογές.",
      interpreted:{confidence:interpreted.confidence,signals:interpreted.signals,travelerType:interpreted.travelerType,mustHave:interpreted.mustHave},
      error:process.env.NODE_ENV==="development"?message:undefined
    },profileKey,503);
  }
}
