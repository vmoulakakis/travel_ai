import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const json=(body:unknown,status=200,cache="no-store")=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":cache,"x-content-type-options":"nosniff"}});
const text=(v:unknown,max=500)=>typeof v==="string"?v.trim().slice(0,max):"";
const vector=(v:unknown)=>Array.isArray(v)&&v.length===16&&v.every(x=>Number.isFinite(Number(x)))?`[${v.map(Number).join(",")}]`:null;

Deno.serve(async(req:Request)=>{
  const base=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!base||!key)return json({ok:false,error:"runtime_credentials_missing"},500);
  const headers={apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json"};
  const rest=async(path:string,init:RequestInit={})=>fetch(`${base}/rest/v1/${path}`,{...init,headers:{...headers,...(init.headers||{})}});
  const url=new URL(req.url);

  if(req.method==="GET"){
    const mode=url.searchParams.get("mode")||"health";
    if(mode==="health"){
      const r=await rest("travel_intelligence_health_v44?select=*&limit=1");
      if(!r.ok)return json({ok:false,error:"health_unavailable"},502);
      const rows=await r.json();return json({ok:true,version:44,health:rows?.[0]??null},200,"private, max-age=15");
    }
    if(mode==="context"){
      const destinations=(url.searchParams.get("destinations")||"").split(",").map(x=>x.trim()).filter(Boolean).slice(0,12);
      const r=await rest("rpc/get_travel_agent_context_v44",{method:"POST",body:JSON.stringify({p_destination_slugs:destinations.length?destinations:null,p_limit:Math.max(1,Math.min(300,Number(url.searchParams.get("limit")||120)))})});
      if(!r.ok)return json({ok:false,error:"context_unavailable",detail:await r.text()},502);
      return json({ok:true,context:await r.json()},200,"private, max-age=20");
    }
    if(mode==="search"){
      const q=text(url.searchParams.get("q"),300),types=(url.searchParams.get("types")||"").split(",").map(x=>x.trim()).filter(Boolean).slice(0,8),destination=text(url.searchParams.get("destination"),100)||null;
      const r=await rest("rpc/search_travel_knowledge_v44",{method:"POST",body:JSON.stringify({p_query_text:q||null,p_query_vector:null,p_entity_types:types.length?types:null,p_destination_slug:destination,p_limit:Math.max(1,Math.min(50,Number(url.searchParams.get("limit")||20)))})});
      if(!r.ok)return json({ok:false,error:"search_unavailable",detail:await r.text()},502);
      return json({ok:true,version:44,query:q,results:await r.json()},200,"private, max-age=20");
    }
    return json({ok:false,error:"unknown_mode"},400);
  }

  if(req.method!=="POST")return json({ok:false,error:"method_not_allowed"},405);
  const body=await req.json().catch(()=>null) as Record<string,unknown>|null;
  if(!body)return json({ok:false,error:"invalid_json"},400);
  const action=text(body.action,50);

  if(action==="semantic-search"){
    const q=text(body.query,300),vec=vector(body.vector),types=Array.isArray(body.entityTypes)?body.entityTypes.map(x=>text(x,40)).filter(Boolean).slice(0,8):null,destination=text(body.destinationSlug,100)||null;
    const r=await rest("rpc/search_travel_knowledge_v44",{method:"POST",body:JSON.stringify({p_query_text:q||null,p_query_vector:vec,p_entity_types:types?.length?types:null,p_destination_slug:destination,p_limit:Math.max(1,Math.min(100,Number(body.limit||20)))})});
    if(!r.ok)return json({ok:false,error:"semantic_search_failed",detail:await r.text()},502);
    return json({ok:true,version:44,results:await r.json()});
  }

  if(action==="start-run"){
    const sessionId=text(body.sessionId,128)||null,objective=text(body.objective,1000)||null,missionId=text(body.missionId,80)||null,input=body.input&&typeof body.input==="object"?body.input:{};
    const r=await rest("travel_agent_runs_v44",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({mission_id:missionId,session_id:sessionId,status:"running",objective,input_snapshot:input,started_at:new Date().toISOString()})});
    if(!r.ok)return json({ok:false,error:"run_start_failed",detail:await r.text()},502);
    const rows=await r.json();return json({ok:true,run:rows?.[0]??null});
  }

  if(action==="record-step"){
    const runId=text(body.runId,80),stageKey=text(body.stageKey,80),agentId=text(body.agentId,80),status=text(body.status,30)||"completed";
    if(!runId||!stageKey||!agentId)return json({ok:false,error:"run_stage_agent_required"},400);
    const confidence=body.confidence==null?null:Math.max(0,Math.min(1,Number(body.confidence)));
    const payload={run_id:runId,stage_key:stageKey,agent_id:agentId,status,input_snapshot:body.input&&typeof body.input==="object"?body.input:{},output_snapshot:body.output&&typeof body.output==="object"?body.output:{},evidence_refs:Array.isArray(body.evidenceRefs)?body.evidenceRefs.slice(0,100):[],confidence,duration_ms:Math.max(0,Number(body.durationMs||0)),llm_calls:Math.max(0,Number(body.llmCalls||0)),estimated_cost_usd:Math.max(0,Number(body.estimatedCostUsd||0)),error:text(body.error,1000)||null,started_at:body.startedAt||null,completed_at:status==="completed"?new Date().toISOString():null};
    const r=await rest("travel_agent_steps_v44?on_conflict=run_id,stage_key",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify(payload)});
    if(!r.ok)return json({ok:false,error:"step_record_failed",detail:await r.text()},502);
    return json({ok:true,step:(await r.json())?.[0]??null});
  }

  if(action==="record-hypothesis"){
    const runId=text(body.runId,80),agentId=text(body.agentId,80),candidateType=text(body.candidateType,50),candidateKey=text(body.candidateKey,160),hypothesis=text(body.hypothesis,1500);
    if(!runId||!agentId||!candidateType||!candidateKey||!hypothesis)return json({ok:false,error:"hypothesis_fields_required"},400);
    const r=await rest("travel_agent_hypotheses_v44",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({run_id:runId,agent_id:agentId,candidate_type:candidateType,candidate_key:candidateKey,hypothesis,score:body.score==null?null:Number(body.score),confidence:body.confidence==null?null:Math.max(0,Math.min(1,Number(body.confidence))),supporting_fact_ids:Array.isArray(body.supportingFactIds)?body.supportingFactIds.slice(0,100):[],contradicting_fact_ids:Array.isArray(body.contradictingFactIds)?body.contradictingFactIds.slice(0,100):[],objections:Array.isArray(body.objections)?body.objections.slice(0,30):[],status:text(body.status,30)||"proposed"})});
    if(!r.ok)return json({ok:false,error:"hypothesis_record_failed",detail:await r.text()},502);
    return json({ok:true,hypothesis:(await r.json())?.[0]??null});
  }

  if(action==="record-decision"){
    const runId=text(body.runId,80),destinationSlug=text(body.destinationSlug,100);if(!runId||!destinationSlug)return json({ok:false,error:"run_destination_required"},400);
    const payload={run_id:runId,destination_slug:destinationSlug,rank:body.rank==null?null:Number(body.rank),selected:body.selected===true,utility_score:body.utilityScore==null?null:Number(body.utilityScore),confidence:body.confidence==null?null:Math.max(0,Math.min(1,Number(body.confidence))),hard_constraints_pass:body.hardConstraintsPass!==false,evidence_coverage:Math.max(0,Math.min(1,Number(body.evidenceCoverage||0))),utility_components:body.utilityComponents&&typeof body.utilityComponents==="object"?body.utilityComponents:{},agent_votes:body.agentVotes&&typeof body.agentVotes==="object"?body.agentVotes:{},reasons:Array.isArray(body.reasons)?body.reasons.slice(0,30):[],tradeoffs:Array.isArray(body.tradeoffs)?body.tradeoffs.slice(0,30):[],fit_vector:vector(body.fitVector)};
    const r=await rest("travel_decision_ledger_v44?on_conflict=run_id,destination_slug",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify(payload)});if(!r.ok)return json({ok:false,error:"decision_record_failed",detail:await r.text()},502);return json({ok:true,decision:(await r.json())?.[0]??null});
  }

  if(action==="finalize-run"){
    const runId=text(body.runId,80);if(!runId)return json({ok:false,error:"run_id_required"},400);
    const patch={status:text(body.status,30)||"completed",result_snapshot:body.result&&typeof body.result==="object"?body.result:{},shared_context:body.sharedContext&&typeof body.sharedContext==="object"?body.sharedContext:{},confidence:body.confidence==null?null:Math.max(0,Math.min(1,Number(body.confidence))),total_duration_ms:Math.max(0,Number(body.durationMs||0)),llm_calls:Math.max(0,Number(body.llmCalls||0)),estimated_cost_usd:Math.max(0,Number(body.estimatedCostUsd||0)),completed_at:new Date().toISOString(),updated_at:new Date().toISOString()};
    const r=await rest(`travel_agent_runs_v44?id=eq.${encodeURIComponent(runId)}`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(patch)});if(!r.ok)return json({ok:false,error:"run_finalize_failed",detail:await r.text()},502);return json({ok:true,run:(await r.json())?.[0]??null});
  }

  if(action==="record-signal"){
    const profileKey=text(body.profileKey,160),eventType=text(body.eventType,60),subjectType=text(body.subjectType,60),subjectKey=text(body.subjectKey,180);if(!eventType||!subjectType||!subjectKey)return json({ok:false,error:"signal_fields_required"},400);
    if(profileKey){await rest("traveler_intelligence_profiles_v44?on_conflict=profile_key",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({profile_key:profileKey,last_seen_at:new Date().toISOString(),updated_at:new Date().toISOString()})});}
    const r=await rest("traveler_signal_events_v44",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({profile_key:profileKey||null,session_id:text(body.sessionId,128)||null,mission_id:text(body.missionId,80)||null,event_type:eventType,subject_type:subjectType,subject_key:subjectKey,value:body.value==null?null:Number(body.value),context:body.context&&typeof body.context==="object"?body.context:{}})});if(!r.ok)return json({ok:false,error:"signal_record_failed",detail:await r.text()},502);return json({ok:true,signal:(await r.json())?.[0]??null});
  }

  return json({ok:false,error:"unknown_action"},400);
});
