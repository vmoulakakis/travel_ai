import {callV70Backend} from "@/lib/ai/v70-supabase-gateway";

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

export async function loadAgentProfilesV70():Promise<Map<string,AgentProfileV70>>{
 const rows=await callV70Backend<AgentProfileV70[]>("agent_profiles",{},6000);
 return new Map(rows.map(row=>[row.agent_id,row]));
}

export async function loadCandidateUniverseV70(locale:V70Locale="el",limit=220):Promise<CandidateNodeV70[]>{
 return callV70Backend<CandidateNodeV70[]>("candidate_universe",{limit:Math.max(1,Math.min(574,limit)),locale},9000);
}

export async function loadDestinationBundleV70(nodeKeys:string[],locale:V70Locale="el",stayLimit=6,entityLimit=80):Promise<DestinationBundleV70>{
 if(!nodeKeys.length)return{destinations:[],entities:[],facts:[],edges:[],stays:[]};
 const value=await callV70Backend<DestinationBundleV70>("destination_bundle",{nodeKeys:[...new Set(nodeKeys)].slice(0,40),locale,stayLimit:Math.max(1,Math.min(12,stayLimit)),entityLimit:Math.max(10,Math.min(120,entityLimit))},11000);
 return{destinations:Array.isArray(value?.destinations)?value.destinations:[],entities:Array.isArray(value?.entities)?value.entities:[],facts:Array.isArray(value?.facts)?value.facts:[],edges:Array.isArray(value?.edges)?value.edges:[],stays:Array.isArray(value?.stays)?value.stays:[]};
}

export async function createFunnelSessionV70(input:{profileKey?:string|null;authUserId?:string|null;locale?:V70Locale;initialContext?:JsonRecord}):Promise<FunnelSessionV70>{
 const rows=await callV70Backend<FunnelSessionV70[]>("create_session",{profileKey:input.profileKey??null,authUserId:input.authUserId??null,locale:input.locale??"el",initialContext:input.initialContext??{}},6000);
 if(!rows[0])throw new Error("V70 session insert returned no row");
 return rows[0];
}

export async function loadFunnelSessionV70(sessionId:string):Promise<FunnelSessionV70|null>{
 const rows=await callV70Backend<FunnelSessionV70[]>("load_session",{sessionId},5000);
 return rows[0]??null;
}

export async function loadFunnelTurnsV70(sessionId:string,limit=24):Promise<FunnelTurnV70[]>{
 return callV70Backend<FunnelTurnV70[]>("load_turns",{sessionId,limit:Math.max(1,Math.min(60,limit))},5000);
}

export async function appendFunnelTurnV70(input:{sessionId:string;role:FunnelTurnV70["role"];content:string;stage:string;structuredExtract?:JsonRecord;evidenceRefs?:unknown[]}):Promise<FunnelTurnV70>{
 const rows=await callV70Backend<FunnelTurnV70[]>("append_turn",{sessionId:input.sessionId,role:input.role,content:input.content.slice(0,6000),stage:input.stage,structuredExtract:input.structuredExtract??{},evidenceRefs:input.evidenceRefs??[]},5000);
 if(!rows[0])throw new Error("V70 turn insert returned no row");
 return rows[0];
}

export async function updateFunnelSessionV70(sessionId:string,patch:Partial<Pick<FunnelSessionV70,"status"|"current_context"|"context_confidence"|"unresolved_questions"|"candidate_keys"|"top3"|"chosen_destination_key"|"chosen_stay_id"|"model_trace">>):Promise<FunnelSessionV70>{
 const rows=await callV70Backend<FunnelSessionV70[]>("update_session",{sessionId,patch},5000);
 if(!rows[0])throw new Error("V70 session update returned no row");
 return rows[0];
}

export async function loadDiscoverySnapshotV70(locale:V70Locale,contextHash="default-greece"):Promise<DiscoverySnapshotV70|null>{
 const rows=await callV70Backend<DiscoverySnapshotV70[]>("load_discovery_snapshot",{locale,contextHash},5000);
 return rows[0]??null;
}

export async function saveDiscoverySnapshotV70(input:{locale:V70Locale;contextHash?:string;context:JsonRecord;picks:unknown[];evidenceState?:JsonRecord;modelLabel?:string|null;ttlHours?:number}):Promise<DiscoverySnapshotV70>{
 const rows=await callV70Backend<DiscoverySnapshotV70[]>("save_discovery_snapshot",{locale:input.locale,contextHash:input.contextHash??"default-greece",context:input.context,picks:input.picks,evidenceState:input.evidenceState??{},modelLabel:input.modelLabel??null,ttlHours:input.ttlHours??18},6000);
 if(!rows[0])throw new Error("V70 discovery snapshot upsert returned no row");
 return rows[0];
}

export async function loadGuestMemoryV70(profileKey:string|null):Promise<JsonRecord|null>{
 if(!profileKey)return null;
 try{
  const value=await callV70Backend<JsonRecord>("guest_memory",{profileKey},3500);
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
