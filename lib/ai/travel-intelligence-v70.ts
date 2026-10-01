export type V70Locale="el"|"en";
export type JsonRecord=Record<string,unknown>;

export type AgentProfileV70={
 agent_id:string;title:string;mission:string;system_prompt:string;allowed_tools:string[];evidence_policy:JsonRecord;prompt_version:number;
};
export type CandidateNodeV70={
 node_key:string;canonical_slug:string|null;display_name:string;region_label:string|null;latitude:number;longitude:number;
 property_count:number;offer_count:number;min_price:number|null;max_price:number|null;currency:string|null;demand_signal:number|null;
 semantic_text:string;match_readiness:number;content_status:string;verified_fact_count:number;evidence_count:number;avg_confidence:number;avg_evidence_strength:number;
};
export type DestinationBundleV70={destinations:JsonRecord[];entities:JsonRecord[];facts:JsonRecord[];edges:JsonRecord[];stays:JsonRecord[]};
export type FunnelSessionV70={
 id:string;profile_key:string|null;auth_user_id:string|null;locale:V70Locale;status:string;current_context:JsonRecord;
 context_confidence:"low"|"medium"|"high";unresolved_questions:unknown[];candidate_keys:string[];top3:unknown[];
 chosen_destination_key:string|null;chosen_stay_id:string|null;model_trace:JsonRecord;created_at:string;updated_at:string;
};
export type FunnelTurnV70={id:number;session_id:string;role:"user"|"assistant"|"system_event";content:string;stage:string;structured_extract:JsonRecord;evidence_refs:unknown[];created_at:string};
export type DiscoverySnapshotV70={id:string;snapshot_date:string;locale:V70Locale;context_hash:string;context:JsonRecord;picks:unknown[];evidence_state:JsonRecord;model_label:string|null;generated_at:string;expires_at:string};

const baseUrl=()=>process.env.NEXT_PUBLIC_SUPABASE_URL??process.env.SUPABASE_URL??"https://bgvgstpoypqbjnemqcqp.supabase.co";
const serviceKey=()=>process.env.SUPABASE_SERVICE_ROLE_KEY??"";
function serverHeaders(extra:Record<string,string>={}){
 const key=serviceKey();
 if(!key)throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for V70 backend");
 return{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json",...extra};
}
async function readJson<T>(response:Response):Promise<T>{
 if(!response.ok){const body=await response.text().catch(()=>"");throw new Error(`V70 Supabase ${response.status}: ${body.slice(0,500)}`)}
 return await response.json() as T;
}
async function rpcV70<T>(name:string,body:JsonRecord,timeoutMs=7000):Promise<T>{
 const response=await fetch(`${baseUrl().replace(/\/$/,"")}/rest/v1/rpc/${name}`,{
  method:"POST",headers:serverHeaders(),body:JSON.stringify(body),cache:"no-store",signal:AbortSignal.timeout(timeoutMs)
 });
 return readJson<T>(response);
}
async function restV70<T>(path:string,init:RequestInit={},timeoutMs=5000):Promise<T>{
 const response=await fetch(`${baseUrl().replace(/\/$/,"")}/rest/v1/${path}`,{
  ...init,headers:serverHeaders((init.headers??{}) as Record<string,string>),cache:"no-store",signal:AbortSignal.timeout(timeoutMs)
 });
 return readJson<T>(response);
}

export async function loadAgentProfilesV70():Promise<Map<string,AgentProfileV70>>{
 const rows=await restV70<AgentProfileV70[]>("travel_agent_profiles_v70?active=eq.true&select=agent_id,title,mission,system_prompt,allowed_tools,evidence_policy,prompt_version&order=agent_id");
 return new Map(rows.map(row=>[row.agent_id,row]));
}

export async function loadCandidateUniverseV70(locale:V70Locale="el",limit=220):Promise<CandidateNodeV70[]>{
 return rpcV70<CandidateNodeV70[]>("get_agentic_candidate_universe_v70",{p_limit:Math.max(1,Math.min(574,limit)),p_locale:locale},8000);
}

export async function loadDestinationBundleV70(nodeKeys:string[],locale:V70Locale="el",stayLimit=6,entityLimit=80):Promise<DestinationBundleV70>{
 if(!nodeKeys.length)return{destinations:[],entities:[],facts:[],edges:[],stays:[]};
 const value=await rpcV70<DestinationBundleV70>("get_agentic_destination_bundle_v70",{
  p_node_keys:[...new Set(nodeKeys)].slice(0,40),p_locale:locale,p_stay_limit:Math.max(1,Math.min(12,stayLimit)),p_entity_limit:Math.max(10,Math.min(120,entityLimit))
 },10000);
 return{destinations:Array.isArray(value?.destinations)?value.destinations:[],entities:Array.isArray(value?.entities)?value.entities:[],facts:Array.isArray(value?.facts)?value.facts:[],edges:Array.isArray(value?.edges)?value.edges:[],stays:Array.isArray(value?.stays)?value.stays:[]};
}

export async function createFunnelSessionV70(input:{profileKey?:string|null;authUserId?:string|null;locale?:V70Locale;initialContext?:JsonRecord}):Promise<FunnelSessionV70>{
 const rows=await restV70<FunnelSessionV70[]>("travel_funnel_sessions_v70",{
  method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({
   profile_key:input.profileKey??null,auth_user_id:input.authUserId??null,locale:input.locale??"el",current_context:input.initialContext??{}
  })
 });
 if(!rows[0])throw new Error("V70 session insert returned no row");
 return rows[0];
}

export async function loadFunnelSessionV70(sessionId:string):Promise<FunnelSessionV70|null>{
 const rows=await restV70<FunnelSessionV70[]>(`travel_funnel_sessions_v70?id=eq.${encodeURIComponent(sessionId)}&select=*&limit=1`);
 return rows[0]??null;
}

export async function loadFunnelTurnsV70(sessionId:string,limit=24):Promise<FunnelTurnV70[]>{
 return restV70<FunnelTurnV70[]>(`travel_funnel_turns_v70?session_id=eq.${encodeURIComponent(sessionId)}&select=*&order=id.asc&limit=${Math.max(1,Math.min(60,limit))}`);
}

export async function appendFunnelTurnV70(input:{sessionId:string;role:FunnelTurnV70["role"];content:string;stage:string;structuredExtract?:JsonRecord;evidenceRefs?:unknown[]}):Promise<FunnelTurnV70>{
 const rows=await restV70<FunnelTurnV70[]>("travel_funnel_turns_v70",{
  method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({
   session_id:input.sessionId,role:input.role,content:input.content.slice(0,6000),stage:input.stage,
   structured_extract:input.structuredExtract??{},evidence_refs:input.evidenceRefs??[]
  })
 });
 if(!rows[0])throw new Error("V70 turn insert returned no row");
 return rows[0];
}

export async function updateFunnelSessionV70(sessionId:string,patch:Partial<Pick<FunnelSessionV70,"status"|"current_context"|"context_confidence"|"unresolved_questions"|"candidate_keys"|"top3"|"chosen_destination_key"|"chosen_stay_id"|"model_trace">>):Promise<FunnelSessionV70>{
 const rows=await restV70<FunnelSessionV70[]>(`travel_funnel_sessions_v70?id=eq.${encodeURIComponent(sessionId)}`,{
  method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({...patch,updated_at:new Date().toISOString()})
 });
 if(!rows[0])throw new Error("V70 session update returned no row");
 return rows[0];
}

export async function loadDiscoverySnapshotV70(locale:V70Locale,contextHash="default-greece"):Promise<DiscoverySnapshotV70|null>{
 const now=encodeURIComponent(new Date().toISOString());
 const rows=await restV70<DiscoverySnapshotV70[]>(`travel_discovery_snapshots_v70?locale=eq.${locale}&context_hash=eq.${encodeURIComponent(contextHash)}&expires_at=gt.${now}&select=*&order=generated_at.desc&limit=1`);
 return rows[0]??null;
}

export async function saveDiscoverySnapshotV70(input:{locale:V70Locale;contextHash?:string;context:JsonRecord;picks:unknown[];evidenceState?:JsonRecord;modelLabel?:string|null;ttlHours?:number}):Promise<DiscoverySnapshotV70>{
 const now=new Date(),expires=new Date(now.getTime()+Math.max(1,Math.min(48,input.ttlHours??18))*3600000);
 const payload={snapshot_date:now.toISOString().slice(0,10),locale:input.locale,context_hash:input.contextHash??"default-greece",context:input.context,picks:input.picks,evidence_state:input.evidenceState??{},model_label:input.modelLabel??null,generated_at:now.toISOString(),expires_at:expires.toISOString()};
 const rows=await restV70<DiscoverySnapshotV70[]>("travel_discovery_snapshots_v70?on_conflict=snapshot_date,locale,context_hash",{
  method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify(payload)
 });
 if(!rows[0])throw new Error("V70 discovery snapshot upsert returned no row");
 return rows[0];
}

export async function loadGuestMemoryV70(profileKey:string|null):Promise<JsonRecord|null>{
 if(!profileKey)return null;
 try{
  const value=await rpcV70<JsonRecord>("get_traveler_context_v45",{p_profile_key:profileKey},3000);
  if(!value||!Object.keys(value).length)return null;
  return{avoidances:value.avoidances??{},travelHistory:value.travelHistory??{},confidence:value.confidence??null,signalCount:value.signalCount??0};
 }catch{return null}
}

export function compactCandidateForPromptV70(node:CandidateNodeV70){
 return{
  key:node.node_key,slug:node.canonical_slug,name:node.display_name,region:node.region_label,lat:node.latitude,lng:node.longitude,
  stays:node.property_count,offers:node.offer_count,priceMin:node.min_price,priceMax:node.max_price,currency:node.currency,
  demandSignal:node.demand_signal,summary:node.semantic_text.slice(0,520),evidence:{verifiedFacts:node.verified_fact_count,evidenceCount:node.evidence_count,avgConfidence:node.avg_confidence,avgStrength:node.avg_evidence_strength},contentStatus:node.content_status
 };
}
