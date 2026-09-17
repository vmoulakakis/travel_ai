-- V44 Travel Intelligence Fabric
-- Shared evidence-backed knowledge graph + agent collaboration substrate.

create table if not exists public.travel_knowledge_entities_v44 (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  canonical_key text not null unique,
  canonical_name text not null,
  name_el text,
  name_en text,
  aliases text[] not null default '{}',
  destination_slug text references public.destination_knowledge_v8(slug) on update cascade on delete set null,
  country_code text,
  latitude double precision,
  longitude double precision,
  semantic_text text not null default '',
  semantic_vector vector(16),
  attributes jsonb not null default '{}'::jsonb,
  source_ref jsonb not null default '{}'::jsonb,
  quality_score real not null default 0.5 check (quality_score between 0 and 1),
  freshness_score real not null default 1 check (freshness_score between 0 and 1),
  active boolean not null default true,
  observed_at timestamptz not null default now(),
  valid_from timestamptz,
  valid_to timestamptz,
  expires_at timestamptz,
  search_document tsvector generated always as (
    to_tsvector('simple'::regconfig,
      coalesce(canonical_name,'') || ' ' ||
      coalesce(name_el,'') || ' ' ||
      coalesce(name_en,'') || ' ' ||
      coalesce(semantic_text,''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists travel_knowledge_entities_v44_type_idx on public.travel_knowledge_entities_v44(entity_type) where active;
create index if not exists travel_knowledge_entities_v44_destination_idx on public.travel_knowledge_entities_v44(destination_slug) where active;
create index if not exists travel_knowledge_entities_v44_search_idx on public.travel_knowledge_entities_v44 using gin(search_document);
create index if not exists travel_knowledge_entities_v44_aliases_idx on public.travel_knowledge_entities_v44 using gin(aliases);
create index if not exists travel_knowledge_entities_v44_vector_idx on public.travel_knowledge_entities_v44 using hnsw(semantic_vector vector_cosine_ops) where semantic_vector is not null;

create table if not exists public.travel_knowledge_evidence_v44 (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_name text not null,
  source_url text,
  publisher text,
  title text,
  excerpt text,
  content_hash text not null unique,
  reliability_score real not null default 0.7 check (reliability_score between 0 and 1),
  freshness_score real not null default 1 check (freshness_score between 0 and 1),
  observed_at timestamptz,
  retrieved_at timestamptz not null default now(),
  valid_from timestamptz,
  valid_to timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists travel_knowledge_evidence_v44_source_idx on public.travel_knowledge_evidence_v44(source_type,source_name);
create index if not exists travel_knowledge_evidence_v44_expiry_idx on public.travel_knowledge_evidence_v44(expires_at) where expires_at is not null;

create table if not exists public.travel_knowledge_facts_v44 (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.travel_knowledge_entities_v44(id) on delete cascade,
  predicate text not null,
  value jsonb not null,
  value_text text,
  polarity smallint not null default 1 check (polarity between -1 and 1),
  confidence real not null default 0.7 check (confidence between 0 and 1),
  evidence_strength real not null default 0.5 check (evidence_strength between 0 and 1),
  source_kind text not null default 'agent',
  source_name text,
  source_ref jsonb not null default '{}'::jsonb,
  claim_hash text not null,
  status text not null default 'provisional',
  produced_by_agent text,
  observed_at timestamptz not null default now(),
  valid_from timestamptz,
  valid_to timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(entity_id,predicate,claim_hash)
);
create index if not exists travel_knowledge_facts_v44_entity_idx on public.travel_knowledge_facts_v44(entity_id,predicate,status);
create index if not exists travel_knowledge_facts_v44_expiry_idx on public.travel_knowledge_facts_v44(expires_at) where status in ('verified','provisional');

create table if not exists public.travel_fact_evidence_v44 (
  fact_id uuid not null references public.travel_knowledge_facts_v44(id) on delete cascade,
  evidence_id uuid not null references public.travel_knowledge_evidence_v44(id) on delete cascade,
  support_weight real not null default 1 check (support_weight between -1 and 1),
  created_at timestamptz not null default now(),
  primary key(fact_id,evidence_id)
);

create table if not exists public.travel_knowledge_edges_v44 (
  id uuid primary key default gen_random_uuid(),
  source_entity_id uuid not null references public.travel_knowledge_entities_v44(id) on delete cascade,
  relation text not null,
  target_entity_id uuid not null references public.travel_knowledge_entities_v44(id) on delete cascade,
  weight real not null default 1,
  confidence real not null default 0.8 check (confidence between 0 and 1),
  evidence_count integer not null default 0,
  attributes jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  valid_from timestamptz,
  valid_to timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_entity_id,relation,target_entity_id)
);
create index if not exists travel_knowledge_edges_v44_source_idx on public.travel_knowledge_edges_v44(source_entity_id,relation) where active;
create index if not exists travel_knowledge_edges_v44_target_idx on public.travel_knowledge_edges_v44(target_entity_id,relation) where active;

create table if not exists public.travel_agent_registry_v44 (
  id text primary key,
  title_el text not null,
  title_en text not null,
  kind text not null,
  mission text not null,
  capabilities text[] not null default '{}',
  allowed_tools text[] not null default '{}',
  hard_rules text[] not null default '{}',
  evidence_requirements jsonb not null default '{}'::jsonb,
  decision_policy jsonb not null default '{}'::jsonb,
  version integer not null default 44,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.travel_agent_workflows_v44 (
  workflow_key text not null,
  stage_key text not null,
  agent_id text not null references public.travel_agent_registry_v44(id),
  sort_order integer not null,
  depends_on text[] not null default '{}',
  can_parallel boolean not null default false,
  required boolean not null default true,
  timeout_ms integer not null default 10000,
  max_retries smallint not null default 1,
  output_contract jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  primary key(workflow_key,stage_key)
);

create table if not exists public.travel_agent_runs_v44 (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid references public.travel_missions(id) on delete set null,
  session_id text,
  workflow_key text not null default 'vacation-discovery-v44',
  orchestrator_version text not null default 'V44',
  status text not null default 'queued',
  objective text,
  input_snapshot jsonb not null default '{}'::jsonb,
  shared_context jsonb not null default '{}'::jsonb,
  result_snapshot jsonb not null default '{}'::jsonb,
  confidence real check (confidence is null or confidence between 0 and 1),
  total_duration_ms integer,
  llm_calls integer not null default 0,
  estimated_cost_usd numeric not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists travel_agent_runs_v44_session_idx on public.travel_agent_runs_v44(session_id,created_at desc);
create index if not exists travel_agent_runs_v44_mission_idx on public.travel_agent_runs_v44(mission_id,created_at desc);

create table if not exists public.travel_agent_steps_v44 (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.travel_agent_runs_v44(id) on delete cascade,
  stage_key text not null,
  agent_id text not null references public.travel_agent_registry_v44(id),
  status text not null default 'queued',
  input_snapshot jsonb not null default '{}'::jsonb,
  output_snapshot jsonb not null default '{}'::jsonb,
  evidence_refs jsonb not null default '[]'::jsonb,
  confidence real check (confidence is null or confidence between 0 and 1),
  duration_ms integer,
  llm_calls integer not null default 0,
  estimated_cost_usd numeric not null default 0,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(run_id,stage_key)
);
create index if not exists travel_agent_steps_v44_run_idx on public.travel_agent_steps_v44(run_id,created_at);

create table if not exists public.travel_agent_hypotheses_v44 (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.travel_agent_runs_v44(id) on delete cascade,
  agent_id text not null references public.travel_agent_registry_v44(id),
  candidate_type text not null,
  candidate_key text not null,
  hypothesis text not null,
  score real,
  confidence real check (confidence is null or confidence between 0 and 1),
  supporting_fact_ids uuid[] not null default '{}',
  contradicting_fact_ids uuid[] not null default '{}',
  objections jsonb not null default '[]'::jsonb,
  status text not null default 'proposed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists travel_agent_hypotheses_v44_run_idx on public.travel_agent_hypotheses_v44(run_id,candidate_type,candidate_key);

create table if not exists public.traveler_intelligence_profiles_v44 (
  profile_key text primary key,
  semantic_vector vector(16),
  preference_weights jsonb not null default '{}'::jsonb,
  hard_constraints jsonb not null default '{}'::jsonb,
  learned_preferences jsonb not null default '{}'::jsonb,
  avoidances jsonb not null default '{}'::jsonb,
  travel_history_summary jsonb not null default '{}'::jsonb,
  confidence real not null default 0 check (confidence between 0 and 1),
  signal_count integer not null default 0,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists traveler_intelligence_profiles_v44_vector_idx on public.traveler_intelligence_profiles_v44 using hnsw(semantic_vector vector_cosine_ops) where semantic_vector is not null;

create table if not exists public.traveler_signal_events_v44 (
  id bigint generated by default as identity primary key,
  profile_key text references public.traveler_intelligence_profiles_v44(profile_key) on delete set null,
  session_id text,
  mission_id uuid references public.travel_missions(id) on delete set null,
  event_type text not null,
  subject_type text not null,
  subject_key text not null,
  value numeric,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists traveler_signal_events_v44_profile_idx on public.traveler_signal_events_v44(profile_key,created_at desc);
create index if not exists traveler_signal_events_v44_subject_idx on public.traveler_signal_events_v44(subject_type,subject_key,created_at desc);

create table if not exists public.travel_decision_ledger_v44 (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.travel_agent_runs_v44(id) on delete cascade,
  destination_slug text not null references public.destination_knowledge_v8(slug) on update cascade,
  rank smallint,
  selected boolean not null default false,
  utility_score real,
  confidence real check (confidence is null or confidence between 0 and 1),
  hard_constraints_pass boolean not null default true,
  evidence_coverage real not null default 0 check (evidence_coverage between 0 and 1),
  utility_components jsonb not null default '{}'::jsonb,
  agent_votes jsonb not null default '{}'::jsonb,
  reasons jsonb not null default '[]'::jsonb,
  tradeoffs jsonb not null default '[]'::jsonb,
  fit_vector vector(16),
  created_at timestamptz not null default now(),
  unique(run_id,destination_slug)
);
create index if not exists travel_decision_ledger_v44_run_idx on public.travel_decision_ledger_v44(run_id,rank);

create table if not exists public.travel_knowledge_jobs_v44 (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references public.travel_knowledge_entities_v44(id) on delete cascade,
  job_type text not null,
  status text not null default 'queued',
  priority smallint not null default 50,
  payload jsonb not null default '{}'::jsonb,
  attempts smallint not null default 0,
  max_attempts smallint not null default 3,
  next_run_at timestamptz not null default now(),
  lease_until timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists travel_knowledge_jobs_v44_queue_idx on public.travel_knowledge_jobs_v44(status,next_run_at,priority desc);
create unique index if not exists travel_knowledge_jobs_v44_active_unique on public.travel_knowledge_jobs_v44(entity_id,job_type) where status in ('queued','running');

alter table public.travel_knowledge_entities_v44 enable row level security;
alter table public.travel_knowledge_evidence_v44 enable row level security;
alter table public.travel_knowledge_facts_v44 enable row level security;
alter table public.travel_fact_evidence_v44 enable row level security;
alter table public.travel_knowledge_edges_v44 enable row level security;
alter table public.travel_agent_registry_v44 enable row level security;
alter table public.travel_agent_workflows_v44 enable row level security;
alter table public.travel_agent_runs_v44 enable row level security;
alter table public.travel_agent_steps_v44 enable row level security;
alter table public.travel_agent_hypotheses_v44 enable row level security;
alter table public.traveler_intelligence_profiles_v44 enable row level security;
alter table public.traveler_signal_events_v44 enable row level security;
alter table public.travel_decision_ledger_v44 enable row level security;
alter table public.travel_knowledge_jobs_v44 enable row level security;

insert into public.travel_agent_registry_v44(id,title_el,title_en,kind,mission,capabilities,allowed_tools,hard_rules,evidence_requirements,decision_policy) values
('decision-orchestrator','Αρχιτέκτονας Απόφασης','Decision Orchestrator','deterministic','Own the decision DAG, shared context, budgets and final admissibility.',array['workflow','coordination','budgeting'],array['agent-registry','decision-ledger','shared-context'],array['never invent facts','never override hard constraints','affiliate economics never affect destination fit'],'{"minimumEvidenceCoverage":0.65}'::jsonb,'{"authority":"stage-order-and-gates"}'::jsonb),
('intent-constraint','Μεταφραστής Πρόθεσης','Intent & Constraint Interpreter','hybrid','Turn natural language and structured answers into a stable traveler objective and hard/soft constraints.',array['intent','semantic-vector','constraint-extraction'],array['traveler-profile','mission-input'],array['do not name destinations','explicit exclusions stay hard'],'{"source":"user"}'::jsonb,'{"authority":"intent-only"}'::jsonb),
('location-truth','Ελεγκτής Γεωγραφίας','Location Truth Agent','deterministic','Resolve origin, geography, countries, regions and supported destination scope.',array['geo-resolution','aliases','scope'],array['knowledge-graph','destination-catalog'],array['zero geography leakage','never silently substitute an unsupported place'],'{"minimumConfidence":0.9}'::jsonb,'{"authority":"geo-gate"}'::jsonb),
('destination-scout','Ανιχνευτής Προορισμών','Destination Scout','agent','Generate diverse destination hypotheses from traveler purpose before accommodation economics.',array['candidate-generation','semantic-retrieval','diversity'],array['knowledge-search','destination-facts'],array['destination before stay','commission never enters score'],'{"factsRequired":2}'::jsonb,'{"authority":"candidate-proposals"}'::jsonb),
('inventory-grounder','Ελεγκτής Inventory','Inventory Grounder','deterministic','Verify real stay inventory, validity, tracked offer evidence and stay-level mandatory constraints.',array['inventory','availability','stay-truth'],array['stay-offers','stay-knowledge','tracking-validity'],array['never invent availability','never rescue a destination with invalid inventory'],'{"realInventory":true}'::jsonb,'{"authority":"inventory-gate"}'::jsonb),
('season-weather','Αναλυτής Εποχής & Καιρού','Season & Weather Analyst','hybrid','Judge seasonal suitability and weather risk with freshness-aware evidence.',array['season','weather','risk'],array['destination-facts','weather-evidence'],array['historical climate is not a forecast','stale weather cannot be presented as live'],'{"freshnessHours":24}'::jsonb,'{"authority":"season-score"}'::jsonb),
('route-friction','Αναλυτής Μετάβασης','Route & Friction Analyst','hybrid','Estimate door-to-destination effort, transport complexity and time-cost tradeoffs.',array['route','friction','mobility'],array['route-evidence','geo-graph'],array['no invented schedules','uncertain transport remains uncertain'],'{"routeEvidenceRequired":true}'::jsonb,'{"authority":"friction-score"}'::jsonb),
('local-experience','Local Experience Scout','Local Experience Scout','agent','Assess local character, experiences, beaches, nature, culture and what the traveler can actually do there.',array['activities','culture','nature','local-fit'],array['knowledge-search','web-evidence'],array['no invented places','source any ranking-changing claim'],'{"factsRequired":3}'::jsonb,'{"authority":"experience-score"}'::jsonb),
('food-scout','Γαστρονομικός Scout','Food Scout','agent','Assess food character and dining fit without turning popularity into truth.',array['food','restaurants','local-products'],array['knowledge-search','web-evidence'],array['no invented ratings','no popularity-only ranking'],'{"factsRequired":2}'::jsonb,'{"authority":"food-score"}'::jsonb),
('value-analyst','Αναλυτής Αξίας','Value Analyst','deterministic','Measure budget realism and value using actual inventory, trip length and traveler constraints.',array['budget','price','value'],array['inventory','decision-context'],array['price must come from evidence','commission never improves user value'],'{"inventoryRequired":true}'::jsonb,'{"authority":"value-score"}'::jsonb),
('skeptical-auditor','Δύσκολος Ελεγκτής','Skeptical Auditor','hybrid','Try to falsify each finalist and surface evidence gaps, contradictions and constraint violations.',array['audit','contradiction','evidence-gap'],array['facts','evidence','hypotheses'],array['reject unsupported certainty','hard violation means reject'],'{"minimumEvidenceCoverage":0.65}'::jsonb,'{"authority":"rejection"}'::jsonb),
('traveler-advocate','Συνήγορος Ταξιδιώτη','Traveler Advocate','agent','Judge verified survivors from the traveler perspective: purpose, rhythm, delight and tradeoffs.',array['human-fit','tradeoffs','narrative'],array['verified-hypotheses','traveler-profile'],array['cannot change facts','cannot override hard gates'],'{"verifiedOnly":true}'::jsonb,'{"authority":"preference-judgement"}'::jsonb),
('decision-synthesizer','Συνθέτης Απόφασης','Decision Synthesizer','hybrid','Merge agent evidence, objections and utility components into a small explainable portfolio.',array['synthesis','portfolio','explanation'],array['decision-ledger','agent-hypotheses'],array['show tradeoffs','preserve uncertainty','no unsupported superlatives'],'{"verifiedOnly":true}'::jsonb,'{"authority":"final-portfolio"}'::jsonb)
on conflict(id) do update set title_el=excluded.title_el,title_en=excluded.title_en,kind=excluded.kind,mission=excluded.mission,capabilities=excluded.capabilities,allowed_tools=excluded.allowed_tools,hard_rules=excluded.hard_rules,evidence_requirements=excluded.evidence_requirements,decision_policy=excluded.decision_policy,version=44,active=true,updated_at=now();

insert into public.travel_agent_workflows_v44(workflow_key,stage_key,agent_id,sort_order,depends_on,can_parallel,required,timeout_ms,max_retries,output_contract) values
('vacation-discovery-v44','understand','intent-constraint',10,'{}',false,true,7000,1,'{"output":"traveler-objective+constraints+vector"}'::jsonb),
('vacation-discovery-v44','scope','location-truth',20,array['understand'],false,true,3000,0,'{"output":"canonical-origin+scope"}'::jsonb),
('vacation-discovery-v44','candidates','destination-scout',30,array['scope'],false,true,7000,1,'{"output":"diverse-destination-hypotheses"}'::jsonb),
('vacation-discovery-v44','inventory','inventory-grounder',40,array['candidates'],true,true,6000,1,'{"output":"inventory-truth"}'::jsonb),
('vacation-discovery-v44','season','season-weather',41,array['candidates'],true,true,7000,1,'{"output":"season-weather-risk"}'::jsonb),
('vacation-discovery-v44','route','route-friction',42,array['candidates'],true,true,7000,1,'{"output":"travel-friction"}'::jsonb),
('vacation-discovery-v44','experience','local-experience',43,array['candidates'],true,true,9000,1,'{"output":"experience-fit"}'::jsonb),
('vacation-discovery-v44','food','food-scout',44,array['candidates'],true,false,9000,1,'{"output":"food-fit"}'::jsonb),
('vacation-discovery-v44','value','value-analyst',45,array['inventory'],true,true,3000,0,'{"output":"budget-value"}'::jsonb),
('vacation-discovery-v44','audit','skeptical-auditor',60,array['inventory','season','route','experience','value'],false,true,6000,1,'{"output":"rejections+evidence-gaps"}'::jsonb),
('vacation-discovery-v44','advocate','traveler-advocate',70,array['audit'],false,true,7000,1,'{"output":"traveler-utility+tradeoffs"}'::jsonb),
('vacation-discovery-v44','synthesize','decision-synthesizer',80,array['advocate'],false,true,5000,1,'{"output":"bounded-final-portfolio"}'::jsonb)
on conflict(workflow_key,stage_key) do update set agent_id=excluded.agent_id,sort_order=excluded.sort_order,depends_on=excluded.depends_on,can_parallel=excluded.can_parallel,required=excluded.required,timeout_ms=excluded.timeout_ms,max_retries=excluded.max_retries,output_contract=excluded.output_contract,active=true;

create or replace function public.refresh_travel_intelligence_fabric_v44()
returns jsonb
language plpgsql
security definer
set search_path='public','extensions','pg_temp'
as $$
declare
  v_destinations integer:=0;
  v_stays integer:=0;
  v_edges integer:=0;
begin
  insert into public.travel_knowledge_entities_v44(entity_type,canonical_key,canonical_name,name_el,name_en,aliases,destination_slug,country_code,latitude,longitude,semantic_text,semantic_vector,attributes,source_ref,quality_score,freshness_score,active,observed_at,updated_at)
  values('country','country:GR','Greece','Ελλάδα','Greece',array['Ελλάδα','Greece','Hellas'],null,'GR',39.0742,21.8243,'Ελλάδα Greece Hellas Mediterranean Europe',null,'{"scope":"country"}'::jsonb,'{"source":"canonical"}'::jsonb,1,1,true,now(),now())
  on conflict(canonical_key) do update set active=true,updated_at=now();

  insert into public.travel_knowledge_entities_v44(entity_type,canonical_key,canonical_name,name_el,name_en,aliases,country_code,semantic_text,attributes,source_ref,quality_score,freshness_score,active,observed_at,updated_at)
  select 'region','region:'||d.region_group,initcap(replace(d.region_group,'_',' ')),null,null,array[d.region_group],max(d.country_code),string_agg(distinct d.region_group,' '),jsonb_build_object('region_group',d.region_group),jsonb_build_object('table','destination_knowledge_v8','region_group',d.region_group),0.9,1,true,max(d.updated_at),now()
  from public.destination_knowledge_v8 d where d.active and nullif(d.region_group,'') is not null group by d.region_group
  on conflict(canonical_key) do update set canonical_name=excluded.canonical_name,aliases=excluded.aliases,country_code=excluded.country_code,semantic_text=excluded.semantic_text,attributes=excluded.attributes,source_ref=excluded.source_ref,active=true,observed_at=excluded.observed_at,updated_at=now();

  insert into public.travel_knowledge_entities_v44(entity_type,canonical_key,canonical_name,name_el,name_en,aliases,destination_slug,country_code,latitude,longitude,semantic_text,semantic_vector,attributes,source_ref,quality_score,freshness_score,active,observed_at,updated_at)
  select 'destination','destination:'||d.slug,coalesce(d.name_el,d.name_en,d.slug),d.name_el,d.name_en,d.aliases,d.slug,d.country_code,d.latitude,d.longitude,
    concat_ws(' · ',d.name_el,d.name_en,d.region_group,array_to_string(d.tags,' '),d.season_profile),d.semantic_vector,
    jsonb_build_object('tags',d.tags,'month_fit',d.month_fit,'ideal_nights_min',d.ideal_nights_min,'ideal_nights_max',d.ideal_nights_max,'cost_tier',d.cost_tier,'effort_athens',d.effort_athens,'effort_thessaloniki',d.effort_thessaloniki,'direct_from_athens',d.direct_from_athens,'route_confidence',d.route_confidence,'traveler_fit',d.traveler_fit,'crowd_level',d.crowd_level,'hotel_radius_km',d.hotel_radius_km,'season_profile',d.season_profile),
    jsonb_build_object('table','destination_knowledge_v8','key',d.slug),greatest(0,least(1,d.route_confidence)),1,d.active,d.updated_at,now()
  from public.destination_knowledge_v8 d
  on conflict(canonical_key) do update set canonical_name=excluded.canonical_name,name_el=excluded.name_el,name_en=excluded.name_en,aliases=excluded.aliases,destination_slug=excluded.destination_slug,country_code=excluded.country_code,latitude=excluded.latitude,longitude=excluded.longitude,semantic_text=excluded.semantic_text,semantic_vector=excluded.semantic_vector,attributes=excluded.attributes,source_ref=excluded.source_ref,quality_score=excluded.quality_score,freshness_score=excluded.freshness_score,active=excluded.active,observed_at=excluded.observed_at,updated_at=now();
  get diagnostics v_destinations=row_count;

  update public.travel_knowledge_entities_v44 e set active=false,updated_at=now()
  where e.entity_type='stay' and e.source_ref->>'table'='stay_product_knowledge_v43' and not exists(select 1 from public.stay_product_knowledge_v43 s where 'stay:'||s.place_id=e.canonical_key);

  insert into public.travel_knowledge_entities_v44(entity_type,canonical_key,canonical_name,aliases,destination_slug,country_code,latitude,longitude,semantic_text,semantic_vector,attributes,source_ref,quality_score,freshness_score,active,observed_at,updated_at)
  select 'stay','stay:'||s.place_id,s.property_name,array_remove(array[s.property_name,s.location_label],null),s.destination_slug,d.country_code,s.latitude,s.longitude,s.semantic_text,s.semantic_vector,
    jsonb_build_object('semantic_tags',s.semantic_tags,'traveler_fit',s.traveler_fit,'offer_count',s.offer_count,'min_price',s.min_price,'max_price',s.max_price,'currency',s.currency,'hero_image_url',s.hero_image_url,'evidence_score',s.evidence_score),
    jsonb_build_object('table','stay_product_knowledge_v43','key',s.place_id),greatest(0,least(1,coalesce(s.evidence_score,0))),1,true,s.updated_at,now()
  from public.stay_product_knowledge_v43 s left join public.destination_knowledge_v8 d on d.slug=s.destination_slug
  on conflict(canonical_key) do update set canonical_name=excluded.canonical_name,aliases=excluded.aliases,destination_slug=excluded.destination_slug,country_code=excluded.country_code,latitude=excluded.latitude,longitude=excluded.longitude,semantic_text=excluded.semantic_text,semantic_vector=excluded.semantic_vector,attributes=excluded.attributes,source_ref=excluded.source_ref,quality_score=excluded.quality_score,freshness_score=excluded.freshness_score,active=true,observed_at=excluded.observed_at,updated_at=now();
  get diagnostics v_stays=row_count;

  insert into public.travel_knowledge_evidence_v44(source_type,source_name,content_hash,reliability_score,freshness_score,observed_at,metadata)
  select 'database','destination_knowledge_v8',md5('destination|'||d.slug||'|'||coalesce(d.updated_at::text,'')||'|'||coalesce(d.semantic_vector::text,'')),1,1,d.updated_at,jsonb_build_object('canonical_key','destination:'||d.slug,'row_key',d.slug)
  from public.destination_knowledge_v8 d
  on conflict(content_hash) do update set retrieved_at=now(),observed_at=excluded.observed_at,metadata=excluded.metadata;

  insert into public.travel_knowledge_evidence_v44(source_type,source_name,content_hash,reliability_score,freshness_score,observed_at,metadata)
  select 'database','stay_product_knowledge_v43',md5('stay|'||s.place_id||'|'||coalesce(s.updated_at::text,'')||'|'||coalesce(s.min_price::text,'')||'|'||coalesce(s.max_price::text,'')),greatest(0,least(1,coalesce(s.evidence_score,0))),1,s.updated_at,jsonb_build_object('canonical_key','stay:'||s.place_id,'row_key',s.place_id)
  from public.stay_product_knowledge_v43 s
  on conflict(content_hash) do update set retrieved_at=now(),observed_at=excluded.observed_at,metadata=excluded.metadata;

  with current_dest as (
    select e.id entity_id,md5(jsonb_build_object('tags',d.tags,'month_fit',d.month_fit,'cost_tier',d.cost_tier,'crowd_level',d.crowd_level,'season_profile',d.season_profile,'traveler_fit',d.traveler_fit,'effort_athens',d.effort_athens,'effort_thessaloniki',d.effort_thessaloniki,'direct_from_athens',d.direct_from_athens)::text) claim_hash
    from public.destination_knowledge_v8 d join public.travel_knowledge_entities_v44 e on e.canonical_key='destination:'||d.slug
  )
  update public.travel_knowledge_facts_v44 f set status='stale',updated_at=now() from current_dest c where f.entity_id=c.entity_id and f.predicate='canonical_destination_profile' and f.claim_hash<>c.claim_hash and f.status='verified';

  insert into public.travel_knowledge_facts_v44(entity_id,predicate,value,value_text,confidence,evidence_strength,source_kind,source_name,source_ref,claim_hash,status,observed_at,updated_at)
  select e.id,'canonical_destination_profile',p.value,d.name_el||' '||array_to_string(d.tags,' '),1,greatest(0,least(1,d.route_confidence)),'database','destination_knowledge_v8',jsonb_build_object('slug',d.slug),md5(p.value::text),'verified',d.updated_at,now()
  from public.destination_knowledge_v8 d join public.travel_knowledge_entities_v44 e on e.canonical_key='destination:'||d.slug
  cross join lateral (select jsonb_build_object('tags',d.tags,'month_fit',d.month_fit,'cost_tier',d.cost_tier,'crowd_level',d.crowd_level,'season_profile',d.season_profile,'traveler_fit',d.traveler_fit,'effort_athens',d.effort_athens,'effort_thessaloniki',d.effort_thessaloniki,'direct_from_athens',d.direct_from_athens) value) p
  on conflict(entity_id,predicate,claim_hash) do update set status='verified',confidence=excluded.confidence,evidence_strength=excluded.evidence_strength,observed_at=excluded.observed_at,updated_at=now();

  with current_stay as (
    select e.id entity_id,md5(jsonb_build_object('semantic_tags',s.semantic_tags,'traveler_fit',s.traveler_fit,'offer_count',s.offer_count,'min_price',s.min_price,'max_price',s.max_price,'currency',s.currency,'evidence_score',s.evidence_score)::text) claim_hash
    from public.stay_product_knowledge_v43 s join public.travel_knowledge_entities_v44 e on e.canonical_key='stay:'||s.place_id
  )
  update public.travel_knowledge_facts_v44 f set status='stale',updated_at=now() from current_stay c where f.entity_id=c.entity_id and f.predicate='canonical_stay_profile' and f.claim_hash<>c.claim_hash and f.status='verified';

  insert into public.travel_knowledge_facts_v44(entity_id,predicate,value,value_text,confidence,evidence_strength,source_kind,source_name,source_ref,claim_hash,status,observed_at,updated_at)
  select e.id,'canonical_stay_profile',p.value,s.semantic_text,greatest(0,least(1,coalesce(s.evidence_score,0))),greatest(0,least(1,coalesce(s.evidence_score,0))),'database','stay_product_knowledge_v43',jsonb_build_object('place_id',s.place_id),md5(p.value::text),'verified',s.updated_at,now()
  from public.stay_product_knowledge_v43 s join public.travel_knowledge_entities_v44 e on e.canonical_key='stay:'||s.place_id
  cross join lateral (select jsonb_build_object('semantic_tags',s.semantic_tags,'traveler_fit',s.traveler_fit,'offer_count',s.offer_count,'min_price',s.min_price,'max_price',s.max_price,'currency',s.currency,'evidence_score',s.evidence_score) value) p
  on conflict(entity_id,predicate,claim_hash) do update set status='verified',confidence=excluded.confidence,evidence_strength=excluded.evidence_strength,observed_at=excluded.observed_at,updated_at=now();

  insert into public.travel_fact_evidence_v44(fact_id,evidence_id,support_weight)
  select f.id,ev.id,1
  from public.travel_knowledge_facts_v44 f
  join public.travel_knowledge_entities_v44 e on e.id=f.entity_id
  join public.travel_knowledge_evidence_v44 ev on ev.metadata->>'canonical_key'=e.canonical_key
  where f.status='verified' and ((f.predicate='canonical_destination_profile' and ev.source_name='destination_knowledge_v8') or (f.predicate='canonical_stay_profile' and ev.source_name='stay_product_knowledge_v43'))
  on conflict do nothing;

  update public.travel_knowledge_edges_v44 set active=false,updated_at=now() where relation in ('contains','has_stay');

  insert into public.travel_knowledge_edges_v44(source_entity_id,relation,target_entity_id,weight,confidence,evidence_count,attributes,active,updated_at)
  select c.id,'contains',d.id,1,1,1,'{"scope":"country-destination"}'::jsonb,true,now()
  from public.travel_knowledge_entities_v44 c join public.travel_knowledge_entities_v44 d on d.entity_type='destination' and d.country_code='GR' and d.active
  where c.canonical_key='country:GR'
  on conflict(source_entity_id,relation,target_entity_id) do update set active=true,confidence=1,updated_at=now();

  insert into public.travel_knowledge_edges_v44(source_entity_id,relation,target_entity_id,weight,confidence,evidence_count,attributes,active,updated_at)
  select r.id,'contains',e.id,1,1,1,jsonb_build_object('region_group',d.region_group),true,now()
  from public.destination_knowledge_v8 d
  join public.travel_knowledge_entities_v44 r on r.canonical_key='region:'||d.region_group
  join public.travel_knowledge_entities_v44 e on e.canonical_key='destination:'||d.slug
  where d.active and nullif(d.region_group,'') is not null
  on conflict(source_entity_id,relation,target_entity_id) do update set active=true,attributes=excluded.attributes,updated_at=now();

  insert into public.travel_knowledge_edges_v44(source_entity_id,relation,target_entity_id,weight,confidence,evidence_count,attributes,active,updated_at)
  select d.id,'has_stay',s.id,1,greatest(0,least(1,coalesce(k.evidence_score,0))),k.offer_count,jsonb_build_object('min_price',k.min_price,'max_price',k.max_price,'currency',k.currency),true,now()
  from public.stay_product_knowledge_v43 k
  join public.travel_knowledge_entities_v44 s on s.canonical_key='stay:'||k.place_id
  join public.travel_knowledge_entities_v44 d on d.canonical_key='destination:'||k.destination_slug
  where k.destination_slug is not null
  on conflict(source_entity_id,relation,target_entity_id) do update set active=true,confidence=excluded.confidence,evidence_count=excluded.evidence_count,attributes=excluded.attributes,updated_at=now();
  get diagnostics v_edges=row_count;

  insert into public.travel_knowledge_jobs_v44(entity_id,job_type,priority,payload)
  select e.id,'destination-evidence-refresh',80,jsonb_build_object('destination_slug',e.destination_slug)
  from public.travel_knowledge_entities_v44 e
  where e.entity_type='destination' and e.active
  on conflict do nothing;

  return jsonb_build_object('version',44,'destinations_upserted',v_destinations,'stays_upserted',v_stays,'stay_edges_upserted',v_edges,'entities_active',(select count(*) from public.travel_knowledge_entities_v44 where active),'facts_verified',(select count(*) from public.travel_knowledge_facts_v44 where status='verified'),'evidence',(select count(*) from public.travel_knowledge_evidence_v44),'jobs_queued',(select count(*) from public.travel_knowledge_jobs_v44 where status='queued'),'completed_at',now());
end;
$$;

create or replace function public.search_travel_knowledge_v44(
  p_query_text text default null,
  p_query_vector vector(16) default null,
  p_entity_types text[] default null,
  p_destination_slug text default null,
  p_limit integer default 20
)
returns table(
  entity_id uuid,
  entity_type text,
  canonical_key text,
  canonical_name text,
  destination_slug text,
  semantic_score real,
  lexical_score real,
  quality_score real,
  freshness_score real,
  final_score real,
  attributes jsonb
)
language sql
stable
security definer
set search_path='public','extensions','pg_temp'
as $$
  with scored as (
    select e.*,
      case when p_query_vector is null or e.semantic_vector is null then 0::real else greatest(0::real,least(1::real,(1-(e.semantic_vector <=> p_query_vector))::real)) end as s_score,
      case when nullif(trim(coalesce(p_query_text,'')),'') is null then 0::real else least(1::real,(ts_rank_cd(e.search_document,websearch_to_tsquery('simple'::regconfig,p_query_text))*4)::real) end as l_score
    from public.travel_knowledge_entities_v44 e
    where e.active
      and (p_entity_types is null or e.entity_type=any(p_entity_types))
      and (p_destination_slug is null or e.destination_slug=p_destination_slug or e.canonical_key='destination:'||p_destination_slug)
  )
  select id,entity_type,canonical_key,canonical_name,destination_slug,s_score,l_score,quality_score,freshness_score,
    (0.55*s_score+0.25*l_score+0.12*quality_score+0.08*freshness_score)::real as final_score,attributes
  from scored
  order by final_score desc,quality_score desc,canonical_name
  limit greatest(1,least(coalesce(p_limit,20),100));
$$;

create or replace function public.get_travel_agent_context_v44(p_destination_slugs text[] default null,p_limit integer default 120)
returns jsonb
language sql
stable
security definer
set search_path='public','extensions','pg_temp'
as $$
  select jsonb_build_object(
    'version',44,
    'generatedAt',now(),
    'entities',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'type',e.entity_type,'key',e.canonical_key,'name',e.canonical_name,'destination',e.destination_slug,'quality',e.quality_score,'freshness',e.freshness_score,'attributes',e.attributes) order by e.entity_type,e.canonical_name) from (select * from public.travel_knowledge_entities_v44 where active and (p_destination_slugs is null or destination_slug=any(p_destination_slugs) or canonical_key=any(array(select 'destination:'||x from unnest(p_destination_slugs) x))) order by quality_score desc limit greatest(1,least(coalesce(p_limit,120),500))) e),'[]'::jsonb),
    'facts',coalesce((select jsonb_agg(jsonb_build_object('entityId',f.entity_id,'predicate',f.predicate,'value',f.value,'confidence',f.confidence,'strength',f.evidence_strength,'status',f.status,'observedAt',f.observed_at)) from public.travel_knowledge_facts_v44 f join public.travel_knowledge_entities_v44 e on e.id=f.entity_id where f.status='verified' and e.active and (p_destination_slugs is null or e.destination_slug=any(p_destination_slugs) or e.canonical_key=any(array(select 'destination:'||x from unnest(p_destination_slugs) x)))),'[]'::jsonb),
    'workflow',coalesce((select jsonb_agg(jsonb_build_object('stage',w.stage_key,'agent',w.agent_id,'order',w.sort_order,'dependsOn',w.depends_on,'parallel',w.can_parallel,'required',w.required) order by w.sort_order) from public.travel_agent_workflows_v44 w where w.workflow_key='vacation-discovery-v44' and w.active),'[]'::jsonb)
  );
$$;

create or replace view public.travel_intelligence_health_v44 as
select
  now() as checked_at,
  (select count(*) from public.travel_knowledge_entities_v44 where active) as active_entities,
  (select count(*) from public.travel_knowledge_entities_v44 where active and entity_type='destination') as destinations,
  (select count(*) from public.travel_knowledge_entities_v44 where active and entity_type='stay') as stays,
  (select count(*) from public.travel_knowledge_facts_v44 where status='verified') as verified_facts,
  (select count(*) from public.travel_knowledge_evidence_v44) as evidence_items,
  (select count(*) from public.travel_knowledge_edges_v44 where active) as active_edges,
  (select count(*) from public.travel_agent_registry_v44 where active) as active_agents,
  (select count(*) from public.travel_agent_workflows_v44 where workflow_key='vacation-discovery-v44' and active) as workflow_stages,
  (select count(*) from public.travel_knowledge_jobs_v44 where status='queued') as queued_enrichment_jobs,
  (select count(*) from public.travel_knowledge_facts_v44 where status in ('verified','provisional') and expires_at is not null and expires_at<now()) as expired_facts;

revoke all on public.travel_knowledge_entities_v44 from anon,authenticated;
revoke all on public.travel_knowledge_evidence_v44 from anon,authenticated;
revoke all on public.travel_knowledge_facts_v44 from anon,authenticated;
revoke all on public.travel_fact_evidence_v44 from anon,authenticated;
revoke all on public.travel_knowledge_edges_v44 from anon,authenticated;
revoke all on public.travel_agent_registry_v44 from anon,authenticated;
revoke all on public.travel_agent_workflows_v44 from anon,authenticated;
revoke all on public.travel_agent_runs_v44 from anon,authenticated;
revoke all on public.travel_agent_steps_v44 from anon,authenticated;
revoke all on public.travel_agent_hypotheses_v44 from anon,authenticated;
revoke all on public.traveler_intelligence_profiles_v44 from anon,authenticated;
revoke all on public.traveler_signal_events_v44 from anon,authenticated;
revoke all on public.travel_decision_ledger_v44 from anon,authenticated;
revoke all on public.travel_knowledge_jobs_v44 from anon,authenticated;
revoke all on public.travel_intelligence_health_v44 from anon,authenticated;
revoke all on function public.refresh_travel_intelligence_fabric_v44() from public,anon,authenticated;
revoke all on function public.search_travel_knowledge_v44(text,vector,text[],text,integer) from public,anon,authenticated;
revoke all on function public.get_travel_agent_context_v44(text[],integer) from public,anon,authenticated;

-- Keep only the joined canonical stay refresh and remove the legacy duplicate refresh.
do $$ begin
  if exists(select 1 from cron.job where jobname='travel-ai-refresh-stay-feed') then
    perform cron.unschedule('travel-ai-refresh-stay-feed');
  end if;
  if exists(select 1 from cron.job where jobname='travel-ai-intelligence-v44') then
    perform cron.unschedule('travel-ai-intelligence-v44');
  end if;
end $$;
select cron.schedule('travel-ai-intelligence-v44','33 2 * * *','select public.refresh_travel_intelligence_fabric_v44();');

select public.refresh_travel_intelligence_fabric_v44();
