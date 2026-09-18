-- Travel AI V45.3: executable tool contract and tool-use observability.
create table if not exists public.travel_tool_registry_v45(
  tool_key text primary key,
  tool_class text not null check(tool_class in ('input','retrieval','deterministic','live-evidence','state','model-assisted')),
  implementation_kind text not null check(implementation_kind in ('rpc','edge','local','table','runtime')),
  implementation_ref text not null,
  trust_level text not null check(trust_level in ('authoritative','verified','derived','advisory')),
  read_only boolean not null default true,
  freshness_required boolean not null default false,
  max_latency_ms integer not null default 3000 check(max_latency_ms between 50 and 60000),
  input_contract jsonb not null default '{}'::jsonb,
  output_contract jsonb not null default '{}'::jsonb,
  failure_policy text not null default 'fail-closed',
  notes text,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.travel_tool_registry_v45
(tool_key,tool_class,implementation_kind,implementation_ref,trust_level,read_only,freshness_required,max_latency_ms,failure_policy,notes)
values
('mission-input','input','local','parseTripRequest + structured request','authoritative',true,false,100,'reject-invalid','User request is authoritative for explicit constraints.'),
('traveler-profile','state','rpc','get_traveler_context_v45','derived',true,false,2200,'continue-without-memory','Persistent memory is a bounded soft prior; current request wins.'),
('knowledge-search','retrieval','rpc','search_travel_knowledge_v45','verified',true,false,2600,'fall-back-to-deterministic-catalog','Hybrid RRF over 16d intent vector + lexical + quality/freshness.'),
('destination-facts','retrieval','rpc','get_travel_agent_context_v44','verified',true,false,2500,'fail-closed-for-ranking-claim','Verified facts and evidence-linked destination context.'),
('knowledge-graph','retrieval','table','travel_knowledge_entities_v44 + travel_knowledge_edges_v44','verified',true,false,2500,'fail-closed','Canonical entities and graph relations.'),
('geo-graph','deterministic','table','travel_knowledge_entities_v44 + canonical destination scope','authoritative',true,false,1800,'reject-ambiguous-geography','No silent place substitution.'),
('destination-catalog','retrieval','edge','destination-catalog-v8','authoritative',true,false,4500,'use-repository-safe-fallback','Canonical supported destination set.'),
('stay-offers','live-evidence','edge','destination-stays-v8 / global-stays-v37','authoritative',true,true,6000,'show-unknown-inventory','Inventory is downstream of destination fit.'),
('stay-knowledge','retrieval','rpc','search_travel_knowledge_v45(entity_type=stay)','verified',true,false,2600,'continue-with-inventory-only','Persistent stay profile evidence.'),
('tracking-validity','deterministic','local','V8/V20 affiliate eligibility + exact tracking URL checks','authoritative',true,true,500,'block-outbound-cta','Never reconstruct tracking links.'),
('weather-evidence','live-evidence','local','enrichV8Weather + Open-Meteo/NASA fallback','verified',true,true,7000,'label-climatology-or-unknown','Forecast and climatology must remain distinct.'),
('route-evidence','deterministic','local','canonical ranking effort + route confidence evidence','derived',true,true,3000,'preserve-uncertainty','Never invent schedules.'),
('web-evidence','model-assisted','local','screenResearchEvidence + recommendation-research-agent-v14','advisory',true,true,9000,'ignore-unverified-output','May enrich or challenge; never invent ranking facts.'),
('inventory','retrieval','local','choice-correctness/stay inventory scan','authoritative',true,true,6000,'fail-closed-for-hard-stay-constraints','Real inventory gate.'),
('decision-context','state','runtime','current bounded request context','authoritative',true,false,100,'fail-run-if-missing','Current request state only.'),
('shared-context','state','runtime','travel_agent_runs_v44.shared_context','derived',false,false,300,'continue-with-stage-input','No hidden chain-of-thought.'),
('agent-registry','state','table','travel_agent_registry_v44','authoritative',true,false,300,'fail-closed','Agent capabilities and allowlists.'),
('decision-ledger','state','table','travel_decision_ledger_v44','derived',false,false,1000,'continue-with-response','Final explainable decision audit.'),
('agent-hypotheses','state','table','travel_agent_hypotheses_v44','derived',false,false,1000,'continue-with-deterministic-ranking','Bounded proposals/objections only.'),
('hypotheses','state','table','travel_agent_hypotheses_v44','derived',true,false,1000,'continue-with-deterministic-ranking','Read current hypotheses.'),
('verified-hypotheses','state','table','travel_agent_hypotheses_v44(status supported/accepted)','verified',true,false,1000,'continue-with-audited-ranked-set','Only verified survivors.'),
('facts','retrieval','table','travel_knowledge_facts_v44(status=verified)','verified',true,false,1800,'reject-unsupported-claim','Facts must retain evidence lineage.'),
('evidence','retrieval','table','travel_knowledge_evidence_v44 + travel_fact_evidence_v44','verified',true,true,2200,'preserve-uncertainty','Evidence freshness and reliability are decision inputs.')
on conflict(tool_key) do update set
  tool_class=excluded.tool_class,
  implementation_kind=excluded.implementation_kind,
  implementation_ref=excluded.implementation_ref,
  trust_level=excluded.trust_level,
  read_only=excluded.read_only,
  freshness_required=excluded.freshness_required,
  max_latency_ms=excluded.max_latency_ms,
  failure_policy=excluded.failure_policy,
  notes=excluded.notes,
  active=true,
  updated_at=now();

alter table public.travel_agent_steps_v44
  add column if not exists tool_keys text[] not null default '{}'::text[];

create or replace function public.get_travel_agent_tool_contract_v45(p_agent_id text)
returns jsonb
language sql
stable
security definer
set search_path to 'public','pg_temp'
as $$
select coalesce((
  select jsonb_build_object(
    'agentId',a.id,
    'kind',a.kind,
    'mission',a.mission,
    'hardRules',a.hard_rules,
    'evidenceRequirements',a.evidence_requirements,
    'decisionPolicy',a.decision_policy,
    'tools',coalesce((
      select jsonb_agg(jsonb_build_object(
        'key',t.tool_key,
        'class',t.tool_class,
        'implementationKind',t.implementation_kind,
        'implementationRef',t.implementation_ref,
        'trust',t.trust_level,
        'readOnly',t.read_only,
        'freshnessRequired',t.freshness_required,
        'maxLatencyMs',t.max_latency_ms,
        'failurePolicy',t.failure_policy
      ) order by u.ord)
      from unnest(a.allowed_tools) with ordinality u(tool_key,ord)
      left join public.travel_tool_registry_v45 t on t.tool_key=u.tool_key and t.active
    ),'[]'::jsonb)
  )
  from public.travel_agent_registry_v44 a
  where a.id=p_agent_id and a.active
),'{}'::jsonb);
$$;

create or replace view public.travel_agent_tool_health_v45 as
select
  now() as checked_at,
  (select count(*) from public.travel_agent_registry_v44 where active) as active_agents,
  (select count(*) from public.travel_tool_registry_v45 where active) as registered_tools,
  (
    select count(*)
    from public.travel_agent_registry_v44 r
    cross join lateral unnest(r.allowed_tools) u(tool_key)
    left join public.travel_tool_registry_v45 t on t.tool_key=u.tool_key and t.active
    where r.active and t.tool_key is null
  ) as unresolved_tool_bindings;

alter table public.travel_tool_registry_v45 enable row level security;
revoke all on public.travel_tool_registry_v45 from anon,authenticated;
grant select on public.travel_tool_registry_v45 to service_role;

revoke execute on function public.search_travel_knowledge_v45(text,extensions.vector,text[],text,integer) from public,anon,authenticated;
revoke execute on function public.upsert_traveler_profile_v45(text,extensions.vector,jsonb,jsonb,jsonb,jsonb,real) from public,anon,authenticated;
revoke execute on function public.record_traveler_signal_v45(text,text,uuid,text,text,text,numeric,jsonb) from public,anon,authenticated;
revoke execute on function public.get_traveler_context_v45(text) from public,anon,authenticated;
revoke execute on function public.finish_travel_agent_run_v45(uuid,text,jsonb,real) from public,anon,authenticated;
revoke execute on function public.get_travel_agent_tool_contract_v45(text) from public,anon,authenticated;
grant execute on function public.search_travel_knowledge_v45(text,extensions.vector,text[],text,integer) to service_role;
grant execute on function public.upsert_traveler_profile_v45(text,extensions.vector,jsonb,jsonb,jsonb,jsonb,real) to service_role;
grant execute on function public.record_traveler_signal_v45(text,text,uuid,text,text,text,numeric,jsonb) to service_role;
grant execute on function public.get_traveler_context_v45(text) to service_role;
grant execute on function public.finish_travel_agent_run_v45(uuid,text,jsonb,real) to service_role;
grant execute on function public.get_travel_agent_tool_contract_v45(text) to service_role;

comment on table public.travel_tool_registry_v45 is
'Executable TravelAI tool contract. Agent allowed_tools must resolve here before runtime use.';
