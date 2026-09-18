import type { TripRequest } from "@/lib/validation/trip";
import type { V8RecommendationResponse } from "@/lib/decision/v8-types";
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

function stepFor(event:TravelOrchestratorEvent){
  if(event.type==="understand:ready")return{stageKey:"understand",agentId:"intent-constraint"};
  if(event.type==="knowledge:ready"||event.type==="shortlist:ready")return{stageKey:"candidates",agentId:"destination-scout"};
  if(event.type==="stay:ready")return{stageKey:"inventory",agentId:"inventory-grounder"};
  if(event.type==="weather:ready")return{stageKey:"season",agentId:"season-weather"};
  if(event.type==="verify:ready")return{stageKey:"audit",agentId:"skeptical-auditor"};
  if(event.type==="council:ready")return{stageKey:"advocate",agentId:"traveler-advocate"};
  return null;
}

async function persistObservedSteps(runId:string,events:TimedEvent[]){
  const chosen=new Map<string,TimedEvent>();
  for(const item of events){const step=stepFor(item.event);if(step)chosen.set(step.stageKey,item)}
  const rows=[...chosen.entries()];
  await Promise.all(rows.map(async([stageKey,item],index)=>{
    const step=stepFor(item.event)!;
    const previous=index===0?events[0]?.at??item.at:rows[index-1]?.[1].at??item.at;
    await writeTravelAgentStepV45({
      runId,stageKey,agentId:step.agentId,status:"completed",
      outputSnapshot:{eventType:item.event.type,...(item.event.payload??{})},
      evidenceRefs:item.event.type==="knowledge:ready"?(item.event.payload?.top??[]):{},
      confidence:confidenceFromPayload(item.event.payload),
      durationMs:Math.max(0,item.at-previous)
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
    const confidence=Number(result.intent.semantic?.confidence??.8);
    await Promise.all([
      persistTravelerProfileV45(profileKey,trip,result.intent,result.recommendations),
      recordTravelerSignalV45({
        profileKey,sessionId,eventType:"recommendation_impression",subjectType:"portfolio",subjectKey:sessionId,
        context:{slugs:result.recommendations.slice(0,3).map(r=>r.slug),engine:"V45"}
      })
    ]);
    if(runId){
      await persistObservedSteps(runId,events);
      await writeTravelAgentStepV45({
        runId,stageKey:"synthesize",agentId:"decision-synthesizer",status:"completed",
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
        runId,stageKey:"synthesize",agentId:"decision-synthesizer",status:"failed",
        outputSnapshot:{},error:error instanceof Error?error.message:String(error),durationMs:Math.max(0,Date.now()-started)
      });
      await finishTravelAgentRunV45(runId,"failed",{error:error instanceof Error?error.message:String(error)},null);
    }
    throw error;
  }
}
