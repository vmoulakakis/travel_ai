import type { TripRequest } from "@/lib/validation/trip";
import { V8_DIMENSIONS,type V8Dimension,type V8IntentProfile,type V8Recommendation } from "@/lib/decision/v8-types";
import type { V8Ranked } from "@/lib/decision/v8-matcher";

type JsonRecord=Record<string,unknown>;
type TravelerContextV45={
 profileKey?:string;
 preferenceWeights?:Partial<Record<V8Dimension,number>>;
 learnedPreferences?:Partial<Record<V8Dimension,number>>;
 hardConstraints?:JsonRecord;
 avoidances?:JsonRecord;
 confidence?:number;
 signalCount?:number;
};
export type KnowledgeHitV45={
 entity_id:string;entity_type:string;canonical_key:string;canonical_name:string;destination_slug:string|null;
 semantic_score:number;lexical_score:number;quality_score:number;freshness_score:number;rrf_score:number;final_score:number;attributes:JsonRecord;
};
export type KnowledgePriorV45={enabled:boolean;hits:KnowledgeHitV45[];bySlug:Map<string,number>};

const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
const baseUrl=()=>process.env.NEXT_PUBLIC_SUPABASE_URL??process.env.SUPABASE_URL??"https://bgvgstpoypqbjnemqcqp.supabase.co";
const serviceKey=()=>process.env.SUPABASE_SERVICE_ROLE_KEY??"";
export const TRAVEL_PROFILE_COOKIE="travel_profile_key";
const profileCookiePattern=/(?:^|;\s*)travel_profile_key=([0-9a-f-]{36})(?:;|$)/i;
export function travelerProfileKeyFromRequest(request:Request){return request.headers.get("cookie")?.match(profileCookiePattern)?.[1]??null}
function headers(){const key=serviceKey();return key?{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json"}:null}

async function rpc<T>(name:string,body:JsonRecord,timeout=3000):Promise<T|null>{
 const h=headers();if(!h)return null;
 try{
  const r=await fetch(`${baseUrl().replace(/\/$/,"")}/rest/v1/rpc/${name}`,{method:"POST",headers:h,body:JSON.stringify(body),cache:"no-store",signal:AbortSignal.timeout(timeout)});
  if(!r.ok)return null;
  return await r.json() as T;
 }catch{return null}
}

export function intentVectorV45(intent:V8IntentProfile){return V8_DIMENSIONS.map(d=>clamp(Number(intent.weights[d]??0)))}
function vectorLiteral(values:number[]){return `[${values.map(v=>Number(v.toFixed(6))).join(",")}]`}

export async function loadTravelerContextV45(profileKey:string):Promise<TravelerContextV45|null>{
 if(!profileKey)return null;
 const value=await rpc<TravelerContextV45>("get_traveler_context_v45",{p_profile_key:profileKey},2200);
 return value&&Object.keys(value).length?value:null;
}

export function learnedPreferencesV45(context:TravelerContextV45|null){
 const out:Partial<Record<V8Dimension,number>>={};
 const raw=context?.learnedPreferences;
 if(!raw||typeof raw!=="object")return out;
 for(const d of V8_DIMENSIONS){const n=Number(raw[d]??0);if(Number.isFinite(n)&&n>0)out[d]=clamp(n,0,.35)}
 return out;
}

function searchText(trip:TripRequest){
 return [
  trip.tripText??"",
  ...(trip.moods??[]),
  trip.mustHave&&trip.mustHave!=="none"?trip.mustHave:"",
  trip.desiredEnergy??"",
  trip.socialPreference??"",
  trip.pace??"",
  trip.hotelStyle&&trip.hotelStyle!=="any"?trip.hotelStyle:"",
  trip.distancePreference&&trip.distancePreference!=="any"?trip.distancePreference:"",
  trip.avoid&&trip.avoid!=="none"?`avoid ${trip.avoid}`:""
 ].filter(Boolean).join(" ").slice(0,600);
}

export async function loadTravelKnowledgePriorV45(trip:TripRequest,intent:V8IntentProfile):Promise<KnowledgePriorV45>{
 const rows=await rpc<KnowledgeHitV45[]>("search_travel_knowledge_v45",{
  p_query_text:searchText(trip),
  p_query_vector:vectorLiteral(intentVectorV45(intent)),
  p_entity_types:["destination"],
  p_destination_slug:null,
  p_limit:50
 },2600);
 if(!Array.isArray(rows)||!rows.length)return{enabled:false,hits:[],bySlug:new Map()};
 const bySlug=new Map<string,number>();
 for(const row of rows){const slug=String(row.destination_slug??row.canonical_key?.replace(/^destination:/,"")??"");const score=Number(row.final_score);if(slug&&Number.isFinite(score))bySlug.set(slug,clamp(score))}
 return{enabled:true,hits:rows,bySlug};
}

export function applyKnowledgePriorV45(items:V8Ranked[],prior:KnowledgePriorV45){
 if(!prior.enabled||!prior.bySlug.size)return items;
 return items.map(item=>{
  const relevance=prior.bySlug.get(item.destination.slug);
  if(relevance==null)return item;
  // Evidence/semantic retrieval can break close ties among already-eligible destinations,
  // but it may never overpower hard gates or deterministic truth.
  const lift=clamp((relevance-.45)*8,0,4);
  return{...item,score:clamp(item.score+lift,0,100),preScore:clamp(item.preScore+lift,0,100)};
 }).sort((a,b)=>b.score-a.score);
}

export async function persistTravelerProfileV45(profileKey:string,trip:TripRequest,intent:V8IntentProfile,recommendations:V8Recommendation[]){
 const preferenceWeights=Object.fromEntries(V8_DIMENSIONS.map(d=>[d,Number(intent.weights[d]??0)]));
 const hardConstraints={mustHave:trip.mustHave??"none",transportMode:trip.transportMode??"any",dateFlexibility:trip.dateFlexibility??"fixed"};
 const avoidances={avoid:trip.avoid??"none"};
 const history={lastRequestAt:new Date().toISOString(),lastRecommended:recommendations.slice(0,3).map(r=>r.slug)};
 return rpc<JsonRecord>("upsert_traveler_profile_v45",{
  p_profile_key:profileKey,
  p_semantic_vector:vectorLiteral(intentVectorV45(intent)),
  p_preference_weights:preferenceWeights,
  p_hard_constraints:hardConstraints,
  p_avoidances:avoidances,
  p_history:history,
  p_confidence:clamp(Number(intent.semantic?.confidence??.75))
 },2600);
}

export async function recordTravelerSignalV45(input:{profileKey:string;sessionId?:string|null;missionId?:string|null;eventType:string;subjectType?:string;subjectKey?:string|null;value?:number|null;context?:JsonRecord}){
 return rpc<JsonRecord>("record_traveler_signal_v45",{
  p_profile_key:input.profileKey,
  p_session_id:input.sessionId??"",
  p_mission_id:input.missionId??null,
  p_event_type:input.eventType,
  p_subject_type:input.subjectType??"destination",
  p_subject_key:input.subjectKey??null,
  p_value:input.value??null,
  p_context:input.context??{}
 },2200);
}

export async function startTravelAgentRunV45(sessionId:string,objective:string,input:JsonRecord){
 const h=headers();if(!h)return null;
 try{
  const r=await fetch(`${baseUrl().replace(/\/$/,"")}/rest/v1/travel_agent_runs_v44`,{
   method:"POST",headers:{...h,Prefer:"return=representation"},cache:"no-store",signal:AbortSignal.timeout(2200),
   body:JSON.stringify({session_id:sessionId,workflow_key:"vacation-discovery-v44",orchestrator_version:"V45",status:"running",objective,input_snapshot:input,started_at:new Date().toISOString()})
  });
  if(!r.ok)return null;
  const rows=await r.json() as Array<{id?:string}>;return rows[0]?.id??null;
 }catch{return null}
}

export async function writeTravelAgentStepV45(input:{runId:string;stageKey:string;agentId:string;status?:"succeeded"|"failed"|"partial";inputSnapshot?:JsonRecord;outputSnapshot?:JsonRecord;evidenceRefs?:unknown;confidence?:number|null;durationMs?:number;llmCalls?:number;error?:string|null}){
 const h=headers();if(!h)return false;
 try{
  const r=await fetch(`${baseUrl().replace(/\/$/,"")}/rest/v1/travel_agent_steps_v44?on_conflict=run_id,stage_key`,{
   method:"POST",headers:{...h,Prefer:"resolution=merge-duplicates,return=minimal"},cache:"no-store",signal:AbortSignal.timeout(2200),
   body:JSON.stringify({run_id:input.runId,stage_key:input.stageKey,agent_id:input.agentId,status:input.status??"succeeded",input_snapshot:input.inputSnapshot??{},output_snapshot:input.outputSnapshot??{},evidence_refs:input.evidenceRefs??{},confidence:input.confidence==null?null:clamp(input.confidence),duration_ms:Math.max(0,Math.round(input.durationMs??0)),llm_calls:Math.max(0,Math.round(input.llmCalls??0)),estimated_cost_usd:0,error:input.error??null,started_at:new Date(Date.now()-Math.max(0,input.durationMs??0)).toISOString(),completed_at:new Date().toISOString()})
  });return r.ok;
 }catch{return false}
}

export async function finishTravelAgentRunV45(runId:string,status:"succeeded"|"failed"|"partial",result:JsonRecord,confidence?:number|null){
 return rpc<JsonRecord>("finish_travel_agent_run_v45",{p_run_id:runId,p_status:status,p_result:result,p_confidence:confidence??null},2200);
}

export function knowledgeEvidenceRefsV45(prior:KnowledgePriorV45){
 return prior.hits.slice(0,12).map(h=>({entityId:h.entity_id,key:h.canonical_key,score:Number(h.final_score.toFixed(4)),quality:h.quality_score,freshness:h.freshness_score}));
}
