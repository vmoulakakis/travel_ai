-- Travel AI V45: activate the V44 intelligence fabric without replacing the proven deterministic core.
-- Scope: hybrid retrieval, persistent traveler profile, bounded behavioral learning.
-- Safe overlay: no destructive changes to existing V44 tables/functions.

create or replace function public.search_travel_knowledge_v45(
  p_query_text text default null,
  p_query_vector extensions.vector(16) default null,
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
  rrf_score real,
  final_score real,
  attributes jsonb
)
language sql
stable
security definer
set search_path to 'public','extensions','pg_temp'
as $$
with base as (
  select e.*
  from public.travel_knowledge_entities_v44 e
  where e.active
    and (p_entity_types is null or e.entity_type = any(p_entity_types))
    and (
      p_destination_slug is null
      or e.destination_slug = p_destination_slug
      or e.canonical_key = 'destination:' || p_destination_slug
    )
),
scored as (
  select
    b.*,
    case
      when p_query_vector is null or b.semantic_vector is null then 0::real
      else greatest(0::real,least(1::real,(1-(b.semantic_vector <=> p_query_vector))::real))
    end as s_score,
    case
      when nullif(trim(coalesce(p_query_text,'')),'') is null then 0::real
      else least(
        1::real,
        (ts_rank_cd(b.search_document,websearch_to_tsquery('simple'::regconfig,p_query_text))*4)::real
      )
    end as l_score,
    case
      when nullif(trim(coalesce(p_query_text,'')),'') is null then 0::real
      when lower(b.canonical_name)=lower(trim(p_query_text)) then 1::real
      when exists (
        select 1 from unnest(coalesce(b.aliases,'{}'::text[])) a
        where lower(a)=lower(trim(p_query_text))
      ) then .92::real
      else 0::real
    end as exact_score
  from base b
),
ranked as (
  select
    s.*,
    case when p_query_vector is not null
      then row_number() over(order by s.s_score desc,s.quality_score desc,s.freshness_score desc)
    end as semantic_rank,
    case when nullif(trim(coalesce(p_query_text,'')),'') is not null
      then row_number() over(order by (greatest(s.l_score,s.exact_score)) desc,s.quality_score desc,s.freshness_score desc)
    end as lexical_rank
  from scored s
),
fused as (
  select
    r.*,
    (
      coalesce(1.0/(60+semantic_rank),0.0)
      + .85*coalesce(1.0/(60+lexical_rank),0.0)
    )::real as rrf_raw
  from ranked r
),
normalized as (
  select
    f.*,
    case
      when p_query_vector is null and nullif(trim(coalesce(p_query_text,'')),'') is null then 0::real
      else least(1::real,(f.rrf_raw/(1.85/61.0))::real)
    end as rrf_norm
  from fused f
)
select
  n.id,
  n.entity_type,
  n.canonical_key,
  n.canonical_name,
  n.destination_slug,
  n.s_score,
  greatest(n.l_score,n.exact_score)::real,
  n.quality_score,
  n.freshness_score,
  n.rrf_norm,
  (
    case
      when p_query_vector is null and nullif(trim(coalesce(p_query_text,'')),'') is null
        then (.70*n.quality_score + .30*n.freshness_score)
      else (
        .78*n.rrf_norm
        + .10*n.quality_score
        + .07*n.freshness_score
        + .05*greatest(n.l_score,n.exact_score)
      )
    end
  )::real as final_score,
  n.attributes
from normalized n
order by final_score desc,n.quality_score desc,n.freshness_score desc,n.canonical_name
limit greatest(1,least(coalesce(p_limit,20),100));
$$;

create or replace function public.upsert_traveler_profile_v45(
  p_profile_key text,
  p_semantic_vector extensions.vector(16) default null,
  p_preference_weights jsonb default '{}'::jsonb,
  p_hard_constraints jsonb default '{}'::jsonb,
  p_avoidances jsonb default '{}'::jsonb,
  p_history jsonb default '{}'::jsonb,
  p_confidence real default .5
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','extensions','pg_temp'
as $$
declare
  v_key text := trim(coalesce(p_profile_key,''));
  v_result jsonb;
begin
  if length(v_key) < 8 or length(v_key) > 160 then
    raise exception 'invalid profile key';
  end if;

  insert into public.traveler_intelligence_profiles_v44(
    profile_key,semantic_vector,preference_weights,hard_constraints,avoidances,
    travel_history_summary,confidence,last_seen_at,updated_at
  )
  values(
    v_key,p_semantic_vector,coalesce(p_preference_weights,'{}'::jsonb),
    coalesce(p_hard_constraints,'{}'::jsonb),coalesce(p_avoidances,'{}'::jsonb),
    coalesce(p_history,'{}'::jsonb),greatest(0::real,least(1::real,coalesce(p_confidence,.5))),
    now(),now()
  )
  on conflict(profile_key) do update set
    semantic_vector=coalesce(excluded.semantic_vector,traveler_intelligence_profiles_v44.semantic_vector),
    preference_weights=coalesce(excluded.preference_weights,'{}'::jsonb),
    hard_constraints=coalesce(excluded.hard_constraints,'{}'::jsonb),
    avoidances=coalesce(excluded.avoidances,'{}'::jsonb),
    travel_history_summary=
      coalesce(traveler_intelligence_profiles_v44.travel_history_summary,'{}'::jsonb)
      || coalesce(excluded.travel_history_summary,'{}'::jsonb),
    confidence=greatest(
      traveler_intelligence_profiles_v44.confidence,
      greatest(0::real,least(1::real,coalesce(excluded.confidence,.5)))
    ),
    last_seen_at=now(),
    updated_at=now();

  select jsonb_build_object(
    'profileKey',p.profile_key,
    'preferenceWeights',p.preference_weights,
    'learnedPreferences',p.learned_preferences,
    'hardConstraints',p.hard_constraints,
    'avoidances',p.avoidances,
    'confidence',p.confidence,
    'signalCount',p.signal_count,
    'lastSeenAt',p.last_seen_at
  )
  into v_result
  from public.traveler_intelligence_profiles_v44 p
  where p.profile_key=v_key;

  return coalesce(v_result,'{}'::jsonb);
end;
$$;

create or replace function public.record_traveler_signal_v45(
  p_profile_key text,
  p_session_id text,
  p_mission_id uuid default null,
  p_event_type text default 'unknown',
  p_subject_type text default 'destination',
  p_subject_key text default null,
  p_value numeric default null,
  p_context jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','extensions','pg_temp'
as $$
declare
  v_key text := trim(coalesce(p_profile_key,''));
  v_event text := lower(trim(coalesce(p_event_type,'unknown')));
  v_subject text := trim(coalesce(p_subject_key,''));
  v_tags text[] := '{}';
  v_delta real := 0;
  v_learned jsonb := '{}'::jsonb;
  v_tag text;
  v_current real;
  v_next real;
  v_id bigint;
begin
  if length(v_key) < 8 or length(v_key) > 160 then
    raise exception 'invalid profile key';
  end if;

  insert into public.traveler_intelligence_profiles_v44(profile_key,last_seen_at,updated_at)
  values(v_key,now(),now())
  on conflict(profile_key) do update set last_seen_at=now(),updated_at=now();

  insert into public.traveler_signal_events_v44(
    profile_key,session_id,mission_id,event_type,subject_type,subject_key,value,context
  )
  values(
    v_key,nullif(trim(coalesce(p_session_id,'')),''),
    p_mission_id,v_event,lower(trim(coalesce(p_subject_type,'destination'))),
    nullif(v_subject,''),p_value,coalesce(p_context,'{}'::jsonb)
  )
  returning id into v_id;

  v_delta := case v_event
    when 'destination_selected' then .12
    when 'offer_view' then .04
    when 'outbound_click' then .08
    when 'positive_feedback' then .15
    when 'negative_feedback' then -.10
    else 0
  end;

  if v_delta <> 0 and lower(trim(coalesce(p_subject_type,'')))='destination' and v_subject<>'' then
    select coalesce(array_agg(x.tag),'{}'::text[])
    into v_tags
    from (
      select jsonb_array_elements_text(coalesce(e.attributes->'tags','[]'::jsonb)) tag
      from public.travel_knowledge_entities_v44 e
      where e.active and e.entity_type='destination'
        and (e.destination_slug=v_subject or e.canonical_key='destination:'||v_subject)
      limit 1
    ) x;

    select learned_preferences into v_learned
    from public.traveler_intelligence_profiles_v44
    where profile_key=v_key
    for update;

    v_learned := coalesce(v_learned,'{}'::jsonb);
    foreach v_tag in array v_tags loop
      v_current := coalesce((v_learned->>v_tag)::real,0);
      v_next := greatest(0::real,least(.35::real,v_current+v_delta));
      v_learned := jsonb_set(v_learned,array[v_tag],to_jsonb(round(v_next::numeric,4)),true);
    end loop;

    update public.traveler_intelligence_profiles_v44
    set learned_preferences=v_learned,
        confidence=least(1::real,greatest(confidence,.35::real)+least(.20::real,abs(v_delta)/2)),
        last_seen_at=now(),
        updated_at=now()
    where profile_key=v_key;
  end if;

  return jsonb_build_object(
    'ok',true,
    'eventId',v_id,
    'learnedDelta',v_delta,
    'tags',to_jsonb(v_tags),
    'profileKey',v_key
  );
end;
$$;

create or replace function public.get_traveler_context_v45(p_profile_key text)
returns jsonb
language sql
stable
security definer
set search_path to 'public','extensions','pg_temp'
as $$
select coalesce((
  select jsonb_build_object(
    'profileKey',p.profile_key,
    'semanticVector',case when p.semantic_vector is null then null else p.semantic_vector::text end,
    'preferenceWeights',p.preference_weights,
    'learnedPreferences',p.learned_preferences,
    'hardConstraints',p.hard_constraints,
    'avoidances',p.avoidances,
    'travelHistory',p.travel_history_summary,
    'confidence',p.confidence,
    'signalCount',p.signal_count,
    'lastSeenAt',p.last_seen_at
  )
  from public.traveler_intelligence_profiles_v44 p
  where p.profile_key=trim(coalesce(p_profile_key,''))
),'{}'::jsonb);
$$;

create or replace function public.finish_travel_agent_run_v45(
  p_run_id uuid,
  p_status text,
  p_result jsonb default '{}'::jsonb,
  p_confidence real default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_rollup jsonb;
begin
  update public.travel_agent_runs_v44
  set status=case when p_status in ('succeeded','failed','partial') then p_status else 'partial' end,
      result_snapshot=coalesce(p_result,'{}'::jsonb),
      confidence=case when p_confidence is null then confidence else greatest(0::real,least(1::real,p_confidence)) end,
      completed_at=now(),
      updated_at=now()
  where id=p_run_id;

  select public.rollup_travel_agent_run_v44(p_run_id) into v_rollup;
  return coalesce(v_rollup,'{}'::jsonb) || jsonb_build_object('status',p_status);
end;
$$;

comment on function public.search_travel_knowledge_v45 is
'V45 hybrid RRF retrieval over V44 16d intent vectors + lexical search + quality/freshness. Does not replace hard constraints.';
comment on function public.record_traveler_signal_v45 is
'V45 bounded persistent learning. Behavioral signals may update soft learned preferences only; maximum per-dimension learned weight is 0.35.';
