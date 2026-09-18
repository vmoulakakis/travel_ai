import type { TripRequest } from "@/lib/validation/trip";
import { V8_DIMENSIONS,type V8RecommendationResponse } from "@/lib/decision/v8-types";
import { structuredIntent } from "@/lib/ai/intent-v8";
import { runTravelOrchestratorV26,type TravelOrchestratorEmitter,type TravelOrchestratorEvent } from "@/lib/ai/travel-orchestrator-v26";
import {
  finishTravelAgentRunV45,
  learnedPreferencesV45,
  loadTravelerContextV45,
  persistTravelerProfileV45,
  recordTravelerSignalV45,
  startTravelAgentRunV45,
  writeTravelAgentStepV45
} from "@/lib/ai/travel-intelligence-v45";

type TimedEvent={event:TravelOrchestratorEvent;at:number};

function objective(trip:TripRequest){
  return (trip.tripText?.trim()||[
    ...(trip.moods??[]),
    trip.mustHave&&trip.mustHave!=="none"?trip.mustHave:"",
    trip.desiredEnergy??"",
    trip.socialPreference??"",
    trip.pace??""
  ].filter(Boolean).join(" + ")).slice(0,500);
}

function confidenceFromPayload(payload?:Record<string,unknown>){
  const n=Number(payload?.confidence);
  return Number.isFinite(n)?Math.max(0,Math.min(1,n)):null;
}

type ObservedStep={stageKey:string;agentId:string;toolKeys:string[];item:TimedEvent};

function stepSpecs(event:TravelOrchestratorEvent,trip:TripRequest):Array<Omit<ObservedStep,"item">>{
  if(event.type==="understand:ready")return[{stageKey:"understand",agentId:"intent-constraint",toolKeys:["mission-input","traveler-profile"]}];
  if(event.type==="scope:ready")return[{stageKey:"scope",agentId:"location-truth",toolKeys:["geo-graph","destination-catalog"]}];
  if(event.type==="knowledge:ready")return[{stageKey:"candidates",agentId:"destination-scout",toolKeys:["knowledge-search","destination-facts","destination-catalog"]}];
  if(event.type==="choice:ready"||event.type==="stay:ready")return[
    {stageKey:"inventory",agentId:"inventory-grounder",toolKeys:["inventory","stay-offers","stay-knowledge","tracking-validity"]},
    {stageKey:"value",agentId:"value-analyst",toolKeys:["inventory","decision-context"]}
  ];
  if(event.type==="weather:ready")return[
    {stageKey:"season",agentId:"season-weather",toolKeys:["weather-evidence","destination-facts"]},
    {stageKey:"route",agentId:"route-friction",toolKeys:["route-evidence","geo-graph"]}
  ];
  if(event.type==="research:ready"){
    const specs:Array<Omit<ObservedStep,"item">>=[{stageKey:"experience",agentId:"local-experience",toolKeys:["knowledge-search","web-evidence"]}];
    const text=(trip.tripText??"").toLowerCase();
    if(trip.moods.includes("food")||/food|restaurant|φαγη|γαστρο|ταβερν/.test(text))specs.push({stageKey:"food",agentId:"food-scout",toolKeys:["knowledge-search","web-evidence"]});
    return specs;
  }
  if(event.type==="verify:ready")return[{stageKey:"audit",agentId:"skeptical-auditor",toolKeys:["facts","evidence","hypotheses"]}];
  if(event.type==="council:ready")return[{stageKey:"advocate",agentId:"traveler-advocate",toolKeys:["verified-hypotheses","traveler-profile"]}];
  return[];
}

async function persistObservedSteps(runId:string,events:TimedEvent[],trip:TripRequest){
  const chosen=new Map<string,ObservedStep>();
  for(const item of events)for(const spec of stepSpecs(item.event,trip))chosen.set(spec.stageKey,{...spec,item});
  const rows=[...chosen.values()].sort((a,b)=>a.item.at-b.item.at);
  await Promise.all(rows.map(async(row,index)=>{
    const previous=index===0?events[0]?.at??row.item.at:rows[index-1]?.item.at??row.item.at;
    await writeTravelAgentStepV45({
      runId,stageKey:row.stageKey,agentId:row.agentId,status:"completed",toolKeys:row.toolKeys,
      outputSnapshot:{eventType:row.item.event.type,...(row.item.event.payload??{})},
      evidenceRefs:row.item.event.type==="knowledge:ready"?(row.item.event.payload?.top??[]):{},
      confidence:confidenceFromPayload(row.item.event.payload),
      durationMs:Math.max(0,row.item.at-previous)
    });
  }));
}

export async function runTravelOrchestratorV45(
  trip:TripRequest,
  sessionId:string,
  profileKey:string,
  emit:TravelOrchestratorEmitter=()=>{}
):Promise<V8RecommendationResponse>{
  const started=Date.now(),events:TimedEvent[]=[];
  const [profile,runId]=await Promise.all([
    loadTravelerContextV45(profileKey),
    startTravelAgentRunV45(sessionId,objective(trip),{
      profileKey,
      origin:trip.origin,
      startDate:trip.startDate,
      endDate:trip.endDate,
      nights:trip.nights,
      budget:trip.budget,
      moods:trip.moods,
      travelerType:trip.travelerType,
      tripText:trip.tripText??null
    })
  ]);
  const learned=learnedPreferencesV45(profile);
  const tee:TravelOrchestratorEmitter=(event)=>{events.push({event,at:Date.now()});emit(event)};

  try{
    const result=await runTravelOrchestratorV26(trip,sessionId,tee,{learnedPreferences:learned});
    const confidence=Number(result.intent.semantic?.confidence??.8),currentOnly=structuredIntent(trip),explicitWeights={...currentOnly.weights};
    for(const d of V8_DIMENSIONS)explicitWeights[d]=Math.max(Number(explicitWeights[d]??0),Number(result.intent.semantic?.positive[d]??0));
    await Promise.all([
      persistTravelerProfileV45(profileKey,trip,result.intent,result.recommendations,explicitWeights),
      recordTravelerSignalV45({
        profileKey,sessionId,eventType:"recommendation_impression",subjectType:"portfolio",subjectKey:sessionId,
        context:{slugs:result.recommendations.slice(0,3).map(r=>r.slug),engine:"V45"}
      })
    ]);
    if(runId){
      await persistObservedSteps(runId,events,trip);
      await writeTravelAgentStepV45({
        runId,stageKey:"synthesize",agentId:"decision-synthesizer",status:"completed",toolKeys:["decision-ledger","agent-hypotheses"],
        outputSnapshot:{slugs:result.recommendations.slice(0,3).map(r=>r.slug),count:result.recommendations.length,feasibility:result.feasibility},
        confidence,durationMs:Math.max(0,Date.now()-started)
      });
      await finishTravelAgentRunV45(runId,"succeeded",{
        top:result.recommendations.slice(0,3).map(r=>({slug:r.slug,score:r.score,confidence:r.confidence})),
        resultCount:result.resultCount,
        feasibility:result.feasibility,
        profileMemoryApplied:Object.keys(learned).length>0
      },confidence);
    }
    return result;
  }catch(error){
    if(runId){
      await writeTravelAgentStepV45({
        runId,stageKey:"synthesize",agentId:"decision-synthesizer",status:"failed",toolKeys:["decision-ledger","agent-hypotheses"],
        outputSnapshot:{},error:error instanceof Error?error.message:String(error),durationMs:Math.max(0,Date.now()-started)
      });
      await finishTravelAgentRunV45(runId,"failed",{error:error instanceof Error?error.message:String(error)},null);
    }
    throw error;
  }
}
